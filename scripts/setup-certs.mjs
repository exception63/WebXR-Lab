import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces, hostname } from "node:os";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const certificateDirectory = resolve(projectRoot, ".certs");
const force = process.argv.includes("--force");

const paths = {
  rootKey: resolve(certificateDirectory, "rootCA-key.pem"),
  rootCertificate: resolve(certificateDirectory, "rootCA.pem"),
  rootCertificateDer: resolve(certificateDirectory, "WebXR-Lab-Root-CA.cer"),
  rootCertificateProfile: resolve(certificateDirectory, "WebXR-Lab-Root-CA.mobileconfig"),
  serverKey: resolve(certificateDirectory, "server-key.pem"),
  request: resolve(certificateDirectory, "server.csr"),
  extension: resolve(certificateDirectory, "server.ext"),
  certificate: resolve(certificateDirectory, "server.pem"),
  serial: resolve(certificateDirectory, "rootCA.srl"),
};

const writeConfigurationProfile = () => {
  const certificateBase64 = readFileSync(paths.rootCertificateDer).toString("base64");
  const wrappedCertificate = certificateBase64.match(/.{1,68}/g)?.join("\n        ") ?? certificateBase64;
  const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadCertificateFileName</key>
      <string>WebXR-Lab-Root-CA.cer</string>
      <key>PayloadContent</key>
      <data>
        ${wrappedCertificate}
      </data>
      <key>PayloadDescription</key>
      <string>Installs the WebXR-Lab local development root certificate.</string>
      <key>PayloadDisplayName</key>
      <string>WebXR-Lab Local Development CA</string>
      <key>PayloadIdentifier</key>
      <string>com.webxr-lab.local-ca</string>
      <key>PayloadType</key>
      <string>com.apple.security.root</string>
      <key>PayloadUUID</key>
      <string>4D88D681-431A-42B1-92F8-B6D93D1A25C0</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Installs only the public root certificate used by WebXR-Lab on this Mac.</string>
  <key>PayloadDisplayName</key>
  <string>WebXR-Lab Local HTTPS</string>
  <key>PayloadIdentifier</key>
  <string>com.webxr-lab.local-ca-profile</string>
  <key>PayloadOrganization</key>
  <string>WebXR-Lab</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>BCC2F1CC-F950-4BF7-B5BC-2E2865203879</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
  writeFileSync(paths.rootCertificateProfile, profile, "utf8");
};

if (!force && existsSync(paths.certificate) && existsSync(paths.rootCertificate)) {
  if (!existsSync(paths.rootCertificateDer)) {
    execFileSync(
      "openssl",
      ["x509", "-in", paths.rootCertificate, "-outform", "der", "-out", paths.rootCertificateDer],
      { stdio: "inherit" },
    );
  }
  writeConfigurationProfile();
  console.log("Certificates already exist. Use `pnpm certs -- --force` to replace them.");
  console.log(`Vision Pro install profile: ${paths.rootCertificateProfile}`);
  console.log(`Raw certificate (fallback): ${paths.rootCertificateDer}`);
  process.exit(0);
}

execFileSync("openssl", ["version"], { stdio: "ignore" });
mkdirSync(certificateDirectory, { recursive: true });

const localHostName = hostname().replace(/\.local$/i, "");
const dnsNames = new Set(["localhost", `${localHostName}.local`]);
const ipAddresses = new Set(["127.0.0.1"]);

for (const entries of Object.values(networkInterfaces())) {
  for (const entry of entries ?? []) {
    if (entry.family === "IPv4" && !entry.internal) {
      ipAddresses.add(entry.address);
    }
  }
}

const dnsLines = [...dnsNames].map((name, index) => `DNS.${index + 1} = ${name}`);
const ipLines = [...ipAddresses].map((address, index) => `IP.${index + 1} = ${address}`);
const extensions = [
  "authorityKeyIdentifier=keyid,issuer",
  "basicConstraints=CA:FALSE",
  "keyUsage=digitalSignature,keyEncipherment",
  "extendedKeyUsage=serverAuth",
  "subjectAltName=@alt_names",
  "",
  "[alt_names]",
  ...dnsLines,
  ...ipLines,
  "",
].join("\n");

writeFileSync(paths.extension, extensions, "utf8");

const openssl = (arguments_) => execFileSync("openssl", arguments_, { stdio: "inherit" });

openssl(["genrsa", "-out", paths.rootKey, "3072"]);
openssl([
  "req",
  "-x509",
  "-new",
  "-nodes",
  "-key",
  paths.rootKey,
  "-sha256",
  "-days",
  "825",
  "-out",
  paths.rootCertificate,
  "-subj",
  "/CN=WebXR-Lab Local Development CA/O=WebXR-Lab",
]);
openssl(["genrsa", "-out", paths.serverKey, "2048"]);
openssl([
  "req",
  "-new",
  "-key",
  paths.serverKey,
  "-out",
  paths.request,
  "-subj",
  `/CN=${localHostName}.local/O=WebXR-Lab`,
]);
openssl([
  "x509",
  "-req",
  "-in",
  paths.request,
  "-CA",
  paths.rootCertificate,
  "-CAkey",
  paths.rootKey,
  "-CAserial",
  paths.serial,
  "-CAcreateserial",
  "-out",
  paths.certificate,
  "-days",
  "825",
  "-sha256",
  "-extfile",
  paths.extension,
]);
openssl([
  "x509",
  "-in",
  paths.rootCertificate,
  "-outform",
  "der",
  "-out",
  paths.rootCertificateDer,
]);
writeConfigurationProfile();

chmodSync(paths.rootKey, 0o600);
chmodSync(paths.serverKey, 0o600);

console.log("\nWebXR-Lab local HTTPS certificates are ready.");
console.log(`Vision Pro install profile: ${paths.rootCertificateProfile}`);
console.log(`Raw certificate (fallback): ${paths.rootCertificateDer}`);
console.log(`PEM root certificate: ${paths.rootCertificate}`);
console.log("Never copy or share rootCA-key.pem.");
console.log("\nCandidate URLs:");
console.log(`  https://${localHostName}.local:8443`);
for (const address of ipAddresses) {
  if (address !== "127.0.0.1") {
    console.log(`  https://${address}:8443`);
  }
}
