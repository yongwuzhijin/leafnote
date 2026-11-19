# 叶笺 LeafNote

叶笺是一个只在 macOS 上使用的本地 Markdown 编辑器。它用富文本修改 `.md`、`.markdown` 和 `.mdx`，也可以切换到只读预览。文件留在你的电脑上。

## 安装与打包

需要 Node.js 22 或更新版本，以及 pnpm 10。本仓库在 Node.js 22.23.4 上完成了安装、类型检查和单元测试。

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run build
```

在 macOS 上打包 arm64 与 x64 的 dmg 和 zip：

```bash
pnpm run package:mac
```

Linux 不能为 macOS 应用签名或公证，也不能代替 macOS 产出可安装的 dmg。签名和公证只在 GitHub Actions 的 `macos-14` 上执行。

## 签名

只有 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`、`CSC_LINK`、`CSC_KEY_PASSWORD` 五项都是非空字符串时，CI 才会开启 hardened runtime、签名和公证。缺任何一项时，CI 仍上传未签名的 dmg 和 zip，并在日志写明未签名。

未签名包在其他 Mac 上通常会被 Gatekeeper 拦截。接收者可以在系统设置或 Finder 的「打开」里明确同意后运行。这不是「任何情况下都打不开」，也不是正式分发状态。双击即开、不需要额外确认的包才需要公证。本文不把公证描述成已经完成。

## 离线

应用不发起网络请求，不接入统计、崩溃上报或自动更新，也不下载远程图片。预览里的网页链接交给系统打开，叶笺自己不请求那个地址。
