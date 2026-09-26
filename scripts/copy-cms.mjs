/**
 * 把 Sveltia CMS 的浏览器包从 node_modules 复制到 public/admin/，
 * 让编辑器从你自己的 Azure 域名加载，不依赖 unpkg CDN。
 *
 * 这些产物是构建时生成的，已在 .gitignore 里忽略，不需要提交。
 *
 * 顺带修一个上游的坑：Sveltia 会把"界面语言包"的地址硬编码成
 * `${CDN}/@sveltia/cms@<自己的版本号>/locales`。一旦它发布的版本
 * unpkg 还没收录（例如 0.221.2），就会 404 并且每 5 秒重试一次，
 * 刷出上百个失败请求，界面也只能是英文。这里把地址改写成同目录下的
 * locales/，彻底摆脱这个依赖。
 */
import { cp, mkdir, access, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = resolve(root, 'node_modules/@sveltia/cms');
const src = resolve(pkg, 'dist');
const dest = resolve(root, 'public/admin');

try {
  await access(resolve(src, 'sveltia-cms.js'));
} catch {
  console.warn('[cms] 找不到 @sveltia/cms，跳过复制。先跑 npm install。');
  process.exit(0);
}

await mkdir(dest, { recursive: true });

// ---- 1. 主包（含语言包地址改写）----
let bundle = await readFile(resolve(src, 'sveltia-cms.js'), 'utf8');

// 压缩后的原文是：HSe=`${aP}@${iP}/locales`
const CDN_LOCALES = '${aP}@${iP}/locales';
const LOCAL_LOCALES = '/admin/locales';

const hits = bundle.split(CDN_LOCALES).length - 1;

if (hits === 1) {
  bundle = bundle.replace(CDN_LOCALES, LOCAL_LOCALES);
  console.log('[cms] 语言包地址已改写为本地 /admin/locales');
} else {
  // 不致命：CMS 照常可用，只是界面回退英文并会重试拉取语言包。
  // 上游版本升级后压缩变量名可能变化，届时这个提示会出现。
  console.warn(
    `[cms] 警告：没找到语言包 CDN 地址（匹配 ${hits} 次，预期 1 次）。` +
      '已跳过改写，界面将回退为英文。请检查 @sveltia/cms 是否升级了。'
  );
}

await writeFile(resolve(dest, 'sveltia-cms.js'), bundle);

// ---- 2. 按需加载的代码块（react-dom 等）----
// 主包会先找脚本同级目录的 chunks/，404 才回退 CDN，所以必须一起复制。
await cp(resolve(src, 'chunks'), resolve(dest, 'chunks'), {
  recursive: true,
  filter: (path) => !path.endsWith('.map'),
});

// ---- 3. 界面语言包 ----
// 注意：fs.cp 的 filter 对目录本身也会调用，所以不能只判断 .json 后缀，
// 否则连 locales/ 这个目录都会被跳过。
await cp(resolve(pkg, 'locales'), resolve(dest, 'locales'), {
  recursive: true,
  filter: (path) => !path.endsWith('.map'),
});

console.log('[cms] Sveltia CMS 已复制到 public/admin/');
