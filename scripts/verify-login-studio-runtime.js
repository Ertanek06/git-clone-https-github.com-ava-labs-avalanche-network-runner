import { getLoginStudioState } from "../src/services/login-studio.service.js";

const port = Number(process.env.PORT || 3120);
const state = getLoginStudioState(null);
if (!state.tenantId) throw new Error("PUBLIC_LOGIN_TENANT_MISSING");
const response = await fetch(`http://127.0.0.1:${port}/login`, { headers: { Accept: "text/html" } });
if (!response.ok) throw new Error(`LOGIN_HTTP_${response.status}`);
const html = await response.text();
const expected = [
  `--left-title-x:${state.studio.left_title_x}%`,
  `--left-title-y:${state.studio.left_title_y}%`,
  `--left-text-x:${state.studio.left_text_x}%`,
  `--left-text-y:${state.studio.left_text_y}%`,
  `data-media-id="${state.selectedMedia.id}"`,
  `data-media-kind="${state.selectedMedia.kind}"`
];
for (const token of expected) {
  if (!html.includes(token)) throw new Error(`LOGIN_STUDIO_RUNTIME_MISMATCH:${token}`);
}
if (state.selectedMedia.id !== 'none' && state.selectedMedia.id !== 'image' && state.selectedMedia.kind !== 'video') throw new Error(`LOGIN_MEDIA_KIND_INVALID:${state.selectedMedia.kind}`);
console.log(JSON.stringify({ ok: true, tenantId: state.tenantId, mediaId: state.selectedMedia.id, mediaKind: state.selectedMedia.kind, leftTitleX: state.studio.left_title_x, leftTitleY: state.studio.left_title_y, leftTextX: state.studio.left_text_x, leftTextY: state.studio.left_text_y }));
