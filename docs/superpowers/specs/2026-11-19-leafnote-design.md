# 叶笺 LeafNote 设计说明

日期：2026-11-19
状态：待目标仓库评审。本文只描述设计，不包含实现。
目标仓库：https://github.com/yongwuzhijin/leafnote （公开）
本文在目标仓库中的路径：`docs/superpowers/specs/2026-11-19-leafnote-design.md`
源码边界锁定在 Orca 提交 `73fd1d0329c15ee5b3faf1fa76dea91fd764c281`（https://github.com/yongwuzhijin/orca）。Orca 仓库保持不变，本文不提交到 Orca。

## 1. 已定决定

- 产品名：叶笺。英文名：LeafNote。只做 macOS。
- 第一版必须是富文本编辑，同时提供独立的预览和编辑。支持打开本地文件、存储、另存为、脏状态和关闭前提示。
- 界面中文优先，并提供英文。系统语言以 `zh` 开头时用中文；以 `en` 开头时用英文；其余语言用中文。
- 完全离线。应用进程不发起网络请求，不接入统计、崩溃上报或自动更新。
- 直接分发 dmg 和 zip。不提交 Mac App Store，不做沙箱。
- 签名和公证只用 CI 中可选的 Apple 密钥。密钥不全时产出未签名包，并在产物说明里写明未签名。仓库和配置中不写入 Orca 的团队号 `6CX3WHS9HZ`、bundle id `com.yongwuzhijin.dmonwork` 或产品名 DmonWork。
- 本应用的 bundle id 固定为 `app.leafnote.macos`。
- 一个窗口编辑一个文档，可以同时开多个窗口。
- 许可保持 MIT，并保留上游署名。

## 2. 产品范围

叶笺是一个安装在 macOS 上的本地 Markdown 编辑器。使用者用它打开电脑上的 `.md`、`.markdown`、`.mdx` 文件，以富文本修改，预览排版后的结果，再写回原路径或另存。

第一版包含：

- 富文本编辑：标题、段落、粗体、斜体、删除线、行内代码、链接、引用、有序和无序列表、任务列表、表格、分隔线、围栏代码块及语法着色、可折叠小节、行内公式和公式块、本地图片。
- 斜杠菜单只插入上述块。Mermaid 只作为普通围栏代码插入和显示，不渲染图。
- 编辑和预览两种模式。预览只读，不写盘。
- 打开、存储、另存为；标题栏显示脏标记；关闭脏文档前询问。
- Finder「打开方式」注册上述三个扩展名，等级为 Alternate，不替换使用者已经选择的默认应用。
- 文档内查找。查找不跨文件。

第一版不包含：工作区、Git、SSH、远程文件、评审批注、文档互链索引、Agent、终端、多标签、Mac App Store、Windows、Linux、自动更新、遥测、网络抓取图片、Mermaid 渲染。

## 3. 来源与许可

富文本和预览来自 Orca 编辑器，不是新写一套语法。复制时以提交 `73fd1d0329c15ee5b3faf1fa76dea91fd764c281` 为准。上游仓库为 https://github.com/stablyai/orca ，分叉为 https://github.com/yongwuzhijin/orca 。根目录 `LICENSE` 是 MIT，版权行为 “Copyright (c) 2026 Lovecast Inc.”。

LeafNote 仓库的 `LICENSE` 原样保留该 MIT 声明。另加 `NOTICE`，写明编辑器和预览派生自上述两个地址的 Orca，并列出随代码带入的第三方包及其许可证。叶笺自己新写的壳、IPC 和适配代码以仓库所有者为版权人，同样使用 MIT。

依赖版本沿用源仓库已验证的许可证声明：TipTap 与 `@tiptap/pm` `3.31.3`（MIT）、KaTeX `0.16.47`（MIT）、lowlight `3.3.0`（MIT）、React `19.2.8`（MIT）、Electron `43.7.5`（MIT）、electron-builder `26.15.3`（MIT）。实现时把这些包的许可证文件放进 `NOTICE`，不以本文的 npm 查询代替包内文本。

## 4. 架构

三个进程内边界：

1. 渲染进程只跑界面和 TipTap。`contextIsolation: true`，`nodeIntegration: false`，`sandbox: true`，`webSecurity: true`。渲染进程不能 `require` Node，也不能拼接任意 IPC 通道。
2. preload 只暴露冻结的 `window.leafnote`。方法见第 10 节。
3. 主进程拥有对话框、文件授权、读写和图片复制。每个窗口有自己的授权表，不共享给其他窗口。

构建使用 Electron 43。Orca 对富文本体积的测量发生在 Electron 43 上，第一版沿用同一主版本，避免换运行时后尺寸阈值失去依据。

窗口加载打包后的本地页面。`will-navigate` 和 `setWindowOpenHandler` 拒绝离开该页面。会话层拒绝一切出站请求。不注册自动更新。

## 5. 组件

渲染进程：

- `EditorShell`：模式开关（编辑 / 预览）、脏标记、路径和只读提示。
- `RichEditor`：从 Orca 的 `RichMarkdownEditor` 收束而来，store、工作区和运行时参数改为本窗口的文档状态。
- `SourceEditor`：仅在富文本不能安全接管时出现的等宽文本编辑器。它显示打开时的原文，并在使用者修改后保存这块缓冲区。
- `Preview`：只读预览。
- `FrontMatterBlock`：只读显示 YAML front matter，不进入 TipTap。
- `ImageNode`：向主进程要字节，再用 blob URL 显示。

主进程：

- `WindowHost`：创建窗口和菜单。
- `GrantTable`：记录本窗口使用者点名打开过的绝对路径，以及打开时的 `mtimeMs` 和 `size`。
- `DocumentIo`：UTF-8 读写和同目录原子替换。
- `ImageIo`：解析、读取和复制图片。

从 Orca 带入富文本的文件以 `src/renderer/src/components/editor/` 下这些职责为准：扩展组装 `rich-markdown-extensions.ts`，序列化提交 `rich-markdown-serialization-commit.ts`，风格回写 `rich-markdown-source-reconcile.ts`，块级回写 `rich-markdown-block-source.ts`，安全资格 `markdown-rich-mode.ts`，体积阈值 `markdown-rich-size-limit.ts`，预览插件 `markdown-preview-plugins.ts`。带入后删除对 `@/store`、worktree、SSH 和 `translate()` 全局目录的引用，文案改走叶笺自己的中英词表。

明确删除、不带入：

- `createMarkdownDocLink` 和文档索引。
- 评审批注扩展、批注栏、diff comment。
- HTML 上标链接及其工作区上下文。
- `useLocalImageSrc` 里的运行时主机、连接号和 worktree 缓存键。图片读取改走第 8 节的 IPC。
- Mermaid 渲染组件。围栏文本保留。

斜杠命令保留：标题、引用、列表、任务列表、段落、折叠小节、代码块、分隔线、表格、图片、行内公式、公式块。不保留「插入工作区文档链接」。

## 6. 数据流

打开：

1. 使用者从菜单选择文件，或 macOS 把路径交给 `open-file`。扩展名必须是 `.md`、`.markdown`、`.mdx`，大小写不敏感。
2. 主进程 `stat`。不是普通文件、不是合法 UTF-8、或大于 20 MiB 时，窗口显示错误，授权表不变，磁盘不写。
3. 合法文件进入该窗口的授权表，记录绝对路径、`mtimeMs`、`size` 和是否带 UTF-8 BOM。
4. 渲染进程保存原始字符串。先剥下 front matter 原文，再对正文做第 7 节的资格判断。
5. 可富文本编辑时进入 TipTap，并建立原文、规范形和上次提交三份引用，语义与 `commitRichMarkdownSerialization` 相同。不可富文本编辑时进入 `SourceEditor`，缓冲区就是原始字符串。

编辑：

- 富文本每次提交用 `editor.getMarkdown()` 得到规范形，再经 `reconcileSerializedMarkdown` 贴回原文风格。
- 预览读取当前将要保存的字符串，不另做一次有损转换，也不写盘。
- 资格通过时，编辑模式只有富文本，没有并列的源码开关。资格失败时，编辑模式就是源码编辑器，缓冲区从打开时的原始字符串开始。

保存：

1. 计算待写字节：富文本路径是回写结果；源码路径是缓冲区。有 BOM 则加回。
2. 待写字节与上次读入或成功写入的字节相同，则清除脏标记，不碰磁盘。
3. 路径已存在时，主进程再次 `stat`。`mtimeMs` 或 `size` 与授权表不一致则返回 `stale`，界面询问是否覆盖。取消则不写。
4. 写入使用同目录临时文件，`fsync` 后 `rename` 覆盖目标。成功后更新授权表和时间戳，清除脏标记。
5. 另存为把新路径设为当前文档并加入授权表。原路径留在表中直到窗口关闭，避免另存为过程中丢失回读能力。

关闭：

- 干净窗口直接关。
- 脏窗口弹出「存储 / 不存储 / 取消」。存储走上面的保存；保存失败或被取消则窗口保持打开。不存储则丢弃内存中的修改。

## 7. 富文本资格与不丢数据

这是第一版的安全边界。富文本是默认编辑面；它不能证明往返安全时，编辑面改为源码，文件内容不因打开而被改写。

资格规则直接沿用 Orca：

- 正文超过 `RICH_MARKDOWN_MAX_SIZE_BYTES`（600 KiB UTF-8）时不进入 TipTap。叶笺不提供「仍然用富文本打开」。600 KiB 以上、20 MiB 以下用源码编辑。预览使用 Orca `MarkdownPreviewSizeGate` 的上限 8 MiB：不超过则可以预览，超过则预览区显示文件超过预览上限，编辑与保存仍使用全文。
- front matter 不进入 TipTap，保存时按打开时的原文接回。
- 代码围栏之外若有引用式链接（行首 `[label]: URL`）或脚注定义（行首 `[^id]:`），判定为富文本不支持。
- 代码围栏之外的 HTML 或 JSX 只有在与 Orca `getMarkdownRichModeUnsupportedReason` 相同的往返证明通过后才允许富文本。正文 UTF-16 码元数不超过 5 万时走完整往返；超过 5 万时走 Orca 的大文档证明：先把可保留的 HTML 编码成占位，若编码后仍有 HTML 则证明失败。证明失败即判定为不支持。比较时保留 Orca 对 `<details>` 开标签规范化的同等例外。
- 风格回写的长度上限是 5 万个 UTF-16 码元，与 `RECONCILE_SIZE_CAP_CODE_UNITS` 一致。超过时保存规范形，并保留原文的主导换行符。界面显示一条非阻塞说明：样式已按编辑器的规范形式保存，正文已写入。
- 回写抛错时同样保存规范形并保留主导换行符，同时显示上述说明。
- 规范形与回写结果经二次序列化比对不一致时，放弃这次风格补丁，保存已经通过比对的那一版。不把未证明的拼接结果写入磁盘。
- 编辑器已销毁、拿不到 `getMarkdown()` 时，保存中止并提示重新打开，不把空字符串写入。

打开文件本身不写磁盘。未修改就保存也不写磁盘。源码模式下，使用者没改缓冲区时，保存字节与读入字节相同。

不支持富文本时，编辑区顶部用中文说明原因，并给出对应英文：含 HTML、JSX 或 MDX；含引用式链接；含脚注；文件超过富文本大小上限。源码区可以编辑和保存。预览在大小允许时仍可打开，预览不改缓冲区。

## 8. 本地图片

Markdown 里只写相对文档的路径，不把图片变成 base64。

插入：

1. 渲染进程请求选择图片。主进程对话框允许 `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.avif`、`.bmp`、`.ico`、`.svg`。
2. 尚未保存的新文档不能插入本地图片。界面提示先存储，避免把图片复制到不确定的目录。
3. 主进程把所选文件复制到文档所在目录，使用独占复制，目标名冲突时追加数字后缀。复制结果的真实路径必须仍在文档目录的真实路径之内。
4. 返回 POSIX 相对名。富文本插入 `![](相对名)`。

显示：

1. 渲染进程把图片 `src` 和文档路径交给 `readImage`。`http:`、`https:` 不请求，显示替代文本。这样满足离线，也避免预览时代开外联。
2. `data:` 仅当解码后不超过 1 MiB 时由渲染进程直接显示。更大的 `data:` 显示替代文本，源文本保持不变。
3. 其余 `src` 由主进程相对文档目录解析。拒绝空路径、绝对路径、盘符路径、`..`、设备名、网络共享，以及真实路径不在文档目录内的符号链接。
4. 扩展名必须在第 1 步的允许列表中。大小不超过 20 MiB。SVG 先用 DOMPurify 的 SVG 配置去掉脚本、事件属性和外链，再作为 `image/svg+xml` 的 blob 返回。净化失败则不返回字节。
5. 渲染进程只把返回的字节做成 blob URL。预览和富文本都用这个 URL。

## 9. 预览安全

预览管线沿用 Orca 的顺序：remark-gfm、中日韩换行友好解析、GitHub 风格提示块、软换行、front matter、数学，然后 rehype-raw，再消毒，再标题锚点、代码高亮和 KaTeX。不使用 `remarkMarkdownDocLinks`。

消毒方案以 `rehype-sanitize` 的 `defaultSchema` 为底，只追加 Orca 预览已经追加的 `details`、`summary`、`kbd`、`sub`、`sup`、`ins`。`details` 的类名从 `orca-details` 改为 `leafnote-details`。不追加 `script`、`iframe`、`object`、`embed`、`form`、事件属性。

链接协议只允许 `http`、`https`、`mailto`。点击这些链接时主进程调用系统打开，应用自己不请求该 URL。`javascript:` 和链接上的 `data:` 被消毒去掉。图片 `src` 在消毒结果里只保留 `blob:` 和符合第 8 节的 `data:`。远程图片地址留在替代文本和 title 中，不进入 `src`。

预览区不执行 Markdown 里的脚本。任务列表输入框保持禁用。

## 10. Electron IPC

preload 只提供下面的方法，通道名固定，载荷用结构体而不是自由字符串命令。

- `openDocument()`：返回取消，或 `{ path, content, stamp, bom }`。
- `saveDocument({ path, content, stamp, overwrite })`：返回成功后的新 stamp、`stale`、`denied` 或 `failed`。
- `saveDocumentAs({ content, bom })`：成功时返回新路径和 stamp。
- `pickImage()`：返回取消或源路径。源路径只用于紧接着的 `importImage`，不进入授权表的文档列表。
- `importImage({ documentPath, sourcePath })`：返回相对名或 `denied`。
- `readImage({ documentPath, src })`：返回字节和媒体类型，或 `denied`。
- `writeClipboard(text)`：写入系统剪贴板。渲染进程沙箱不使用 `navigator.clipboard`。
- `confirmDiscard()`：主进程显示「存储 / 不存储 / 取消」。
- `onOpenFromOs(callback)`：订阅本窗口收到的打开事件，返回取消订阅函数。

主进程对每个调用再做一次授权检查。渲染进程声称的路径，若不在本窗口授权表中，读写都返回 `denied`。图片读取使用文档授权，不把图片路径升级成可保存的文档。未知通道不注册。

不复制 Orca 的 `resources/build/entitlements.mac.plist`。该文件包含摄像头、麦克风、定位、蓝牙、Apple Events、JIT 和未签名可执行内存，服务的是 IDE。叶笺非签名的本地运行不使用这些能力。正式 hardened runtime 签名时，只给 Electron 渲染辅助进程添加它启动 V8 所需要的 `com.apple.security.cs.allow-jit` 和 `com.apple.security.cs.allow-unsigned-executable-memory`。不添加 `disable-library-validation`，因为第一版不装原生附加模块。不添加 App Sandbox。

## 11. 打包与签名

在 macOS 上用 electron-builder 分别产出：

- `LeafNote-macos-arm64.dmg` 和 `.zip`
- `LeafNote-macos-x64.dmg` 和 `.zip`

不做单个 universal 二进制。Apple Silicon 和 Intel 各装自己的包。electron-builder 可以在一台 Mac 上交叉打出另一个架构的 Electron 二进制；签名和公证仍在 macOS 上进行。Linux 环境不能公证，也不能代替这台 Mac。

`appId` 为 `app.leafnote.macos`。`productName` 为叶笺，可执行文件名为 `LeafNote`。文件关联的 role 是 Editor，rank 是 Alternate。用途描述字符串不从 Orca 抄录；第一版不访问桌面、文稿和下载目录的批量枚举，只通过打开和保存面板接触使用者选中的路径，因此不填写这些目录的用途说明。

CI 只有在 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`、`CSC_LINK`、`CSC_KEY_PASSWORD` 五项都存在时才开启 hardened runtime、签名和公证。缺任何一项时，该次任务上传未签名的 dmg 和 zip，并在日志和发布说明写「未签名，其他 Mac 上会被 Gatekeeper 拦截」。构建不因为缺密钥而失败，也不读取任何写死的团队号。

未签名包可以在构建者自己的 Mac 上用本地安全设置打开。发给别人的可打开安装包必须经过公证。本文不把公证描述成已经完成。

## 12. 错误处理

| 情况 | 行为 |
| --- | --- |
| 使用者取消对话框 | 保持原文档 |
| 路径不是普通文件、扩展名不符、非 UTF-8、超过 20 MiB | 显示原因，不写入 |
| 富文本不支持或超过 600 KiB | 源码编辑，原文可保存 |
| 预览超过 8 MiB | 预览区说明超过上限，源码编辑仍保存全文 |
| 磁盘上的文件在打开后被改过 | 保存前询问覆盖 |
| 写临时文件或 rename 失败 | 保留脏标记和原文件，显示失败 |
| 编辑器已销毁 | 中止保存，不写空文件 |
| 图片越出文档目录、类型不符、过大或 SVG 净化失败 | 显示替代文本，Markdown 源文本不变 |
| IPC 路径未授权 | `denied`，界面显示无法访问 |

## 13. 测试与验收

单元测试：

- 引用式链接、脚注、无法往返的 HTML 进入源码模式；可往返的普通 HTML 进入富文本。
- 打开后未编辑即保存时，字节与读入一致，包含 BOM、CRLF 和 front matter。
- 富文本只改一处时，未改区域保留原来的非规范写法；这是 Orca `rich-markdown-source-reconcile` 已有的行为，移植后用同样的夹具再测。
- 回写失败时输出是规范形加原来的主导换行，且不是空文件。
- 图片路径 `../`、符号链接逃出目录、网络路径和 SVG 脚本被拒绝。
- 预览消毒去掉 `script`、`javascript:` 链接和远程图片 `src`。

应用测试在 macOS 上对 arm64 包做；x64 包至少做启动、打开、保存、另存为。测试用临时目录，不依赖使用者的文稿目录。

验收标准：

1. 一份不含禁止构造、小于 600 KiB 的 Markdown 以富文本打开，能插入标题、列表、任务、表格、代码、公式和本地图片，预览与编辑内容一致。
2. 存储后磁盘文件包含这些修改；未改动的强调符号风格按第 7 节保留。
3. 含引用式链接的文件以源码打开，打开动作不改变文件时间戳；不编辑就关闭，不出现保存提示。
4. 编辑后标题出现脏标记。关闭时取消留在文档；不存储则磁盘不变；存储则磁盘等于缓冲区。
5. 另存为写出新文件，原文件保持另存为之前的内容。
6. 外部程序改过该文件后，保存会先询问覆盖。
7. 预览不执行 HTML 脚本，不请求远程图片。
8. 应用进程没有出站网络连接。
9. 未配置 Apple 密钥的构建得到未签名的 arm64 和 x64 dmg；配置齐全的构建才签名并公证。产物的签名身份不是 `6CX3WHS9HZ`。
10. `NOTICE` 和 `LICENSE` 含 Lovecast 的 MIT 声明以及 Orca 两个仓库地址。

## 14. 实现时的检查

实现前不再就上述默认项提问。实现中若发现某段 Orca 富文本离开工作区就无法编译，删除该段在第 5 节列出的耦合，而不是把工作区搬进叶笺。验收第 1 条到第 8 条未通过则第一版不算完成。
