const port = Number(process.env.PORT || process.argv[2] || 3120);
const expectedVersion = process.env.EXPECTED_VERSION || process.argv[3] || "3.8.57";
const expectedRelease = process.env.EXPECTED_RELEASE || process.argv[4] || "v3.8.57-crmv1.45-web-import-upsert-ui-document-fix";
const expectedBuild = process.env.EXPECTED_BUILD || process.argv[5] || "crmv1.45";
try {
  const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  const ok = response.ok && body?.ok === true && String(body.version) === String(expectedVersion) && String(body.release) === String(expectedRelease) && String(body.build) === String(expectedBuild);
  if (!ok) {
    console.error(`HEALTH_MISMATCH expected_version=${expectedVersion} expected_release=${expectedRelease} expected_build=${expectedBuild} actual=${JSON.stringify(body)}`);
    process.exit(1);
  }
  console.log(JSON.stringify(body));
} catch (error) {
  console.error(`HEALTH_FAILED ${error.message}`);
  process.exit(1);
}
