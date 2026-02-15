import fs from 'fs';
import path from 'path';

const root = process.cwd();

const iosAppId = 'ca-app-pub-1236052583132522~4949483732';
const androidAppId = 'ca-app-pub-1236052583132522~1313491055';

function ensureFileExists(p) {
  return fs.existsSync(p);
}

function patchAndroidManifest() {
  const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!ensureFileExists(manifestPath)) return;
  const xml = fs.readFileSync(manifestPath, 'utf8');
  if (xml.includes('com.google.android.gms.ads.APPLICATION_ID')) return;
  const insertMeta = `        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="@string/admob_app_id" />\n`;
  const target = '<activity';
  const idx = xml.indexOf(target);
  if (idx === -1) return;
  const before = xml.substring(0, idx);
  const after = xml.substring(idx);
  const updated = before + insertMeta + after;
  fs.writeFileSync(manifestPath, updated, 'utf8');
}

function patchAndroidStrings() {
  const stringsPath = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  if (!ensureFileExists(stringsPath)) return;
  let xml = fs.readFileSync(stringsPath, 'utf8');
  const tag = '<string name="admob_app_id">';
  if (xml.includes(tag)) {
    xml = xml.replace(/<string name="admob_app_id">.*?<\/string>/, `<string name="admob_app_id">${androidAppId}</string>`);
  } else {
    xml = xml.replace('</resources>', `    <string name="admob_app_id">${androidAppId}</string>\n</resources>`);
  }
  fs.writeFileSync(stringsPath, xml, 'utf8');
}

function patchInfoPlist() {
  const plistPath = path.join(root, 'ios', 'App', 'App', 'Info.plist');
  if (!ensureFileExists(plistPath)) return;
  let xml = fs.readFileSync(plistPath, 'utf8');
  // Ensure GADApplicationIdentifier exists and is set to the desired value
  if (xml.includes('<key>GADApplicationIdentifier</key>')) {
    xml = xml.replace(
      /<key>GADApplicationIdentifier<\/key>\s*<string>.*?<\/string>/,
      `<key>GADApplicationIdentifier</key>\n    <string>${iosAppId}</string>`
    );
  } else {
    xml = xml.replace(
      '</dict>\n</plist>',
      `    <key>GADApplicationIdentifier</key>\n    <string>${iosAppId}</string>\n</dict>\n</plist>`
    );
  }
  // Ensure NSUserTrackingUsageDescription present
  if (!xml.includes('<key>NSUserTrackingUsageDescription</key>')) {
    xml = xml.replace(
      '</dict>\n</plist>',
      `    <key>NSUserTrackingUsageDescription</key>\n    <string>Este identificador será usado para entregar anúncios personalizados relevantes.</string>\n</dict>\n</plist>`
    );
  }
  // Ensure at least AdMob SKAdNetworkItems entry present (optional but harmless)
  if (!xml.includes('<key>SKAdNetworkItems</key>')) {
    xml = xml.replace(
      '</dict>\n</plist>',
      `    <key>SKAdNetworkItems</key>\n    <array>\n        <dict>\n            <key>SKAdNetworkIdentifier</key>\n            <string>cstr6suwn9.skadnetwork</string>\n        </dict>\n    </array>\n</dict>\n</plist>`
    );
  }
  fs.writeFileSync(plistPath, xml, 'utf8');
}

try {
  patchAndroidManifest();
  patchAndroidStrings();
  patchInfoPlist();
  process.exit(0);
} catch {
  process.exit(0);
}
