import * as React from "react"
import { marked } from "marked"
import intl from "react-intl-universal"
import { renderToString } from "react-dom/server"
import { RSSItem } from "../scripts/models/item"
import {
    Stack,
    CommandBarButton,
    IContextualMenuProps,
    FocusZone,
    ContextualMenuItemType,
    Spinner,
    Icon,
    Link,
} from "@fluentui/react"
import {
    RSSSource,
    SourceOpenTarget,
    SourceTextDirection,
} from "../scripts/models/source"
import { shareSubmenu } from "./context-menu"
import { platformCtrl, decodeFetchResponse } from "../scripts/utils"

const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20]
const LanguageDetect = require("languagedetect")

type ArticleProps = {
    item: RSSItem
    source: RSSSource
    locale: string
    shortcuts: (item: RSSItem, e: KeyboardEvent) => void
    dismiss: () => void
    offsetItem: (offset: number) => void
    toggleHasRead: (item: RSSItem) => void
    toggleStarred: (item: RSSItem) => void
    toggleHidden: (item: RSSItem) => void
    textMenu: (position: [number, number], text: string, url: string) => void
    imageMenu: (position: [number, number]) => void
    dismissContextMenu: () => void
    updateSourceTextDirection: (
        source: RSSSource,
        direction: SourceTextDirection
    ) => void
}

type ArticleState = {
    fontFamily: string
    fontSize: number
    loadWebpage: boolean
    loadFull: boolean
    fullContent: string
    loaded: boolean
    error: boolean
    errorDescription: string
    aiSummary: string
    aiLoading: boolean
    aiSummaryEnabled: boolean
    aiTranslateLoading: boolean
    aiTranslationMap: { [key: string]: string }
}

class Article extends React.Component<ArticleProps, ArticleState> {
    webview: Electron.WebviewTag

    constructor(props: ArticleProps) {
        super(props)
        this.state = {
            fontFamily: window.settings.getFont(),
            fontSize: window.settings.getFontSize(),
            loadWebpage: props.source.openTarget === SourceOpenTarget.Webpage,
            loadFull: props.source.openTarget === SourceOpenTarget.FullContent,
            fullContent: "",
            loaded: false,
            error: false,
            errorDescription: "",
            aiSummary: "",
            aiLoading: false,
            aiSummaryEnabled: window.settings.getAISettings().enabled,
            aiTranslateLoading: false,
            aiTranslationMap: {},
        }
        window.utils.addWebviewContextListener(this.contextMenuHandler)
        window.utils.addWebviewKeydownListener(this.keyDownHandler)
        window.utils.addWebviewErrorListener(this.webviewError)
        if (props.source.openTarget === SourceOpenTarget.FullContent)
            this.loadFull()
    }

    setFontSize = (size: number) => {
        window.settings.setFontSize(size)
        this.setState({ fontSize: size })
    }
    setFont = (font: string) => {
        window.settings.setFont(font)
        this.setState({ fontFamily: font })
    }

    fontSizeMenuProps = (): IContextualMenuProps => ({
        items: FONT_SIZE_OPTIONS.map(size => ({
            key: String(size),
            text: String(size),
            canCheck: true,
            checked: size === this.state.fontSize,
            onClick: () => this.setFontSize(size),
        })),
    })

    fontFamilyMenuProps = (): IContextualMenuProps => ({
        items: window.fontList.map((font, idx) => ({
            key: String(idx),
            text: font === "" ? intl.get("default") : font,
            canCheck: true,
            checked: this.state.fontFamily === font,
            onClick: () => this.setFont(font),
        })),
    })

    updateTextDirection = (direction: SourceTextDirection) => {
        this.props.updateSourceTextDirection(this.props.source, direction)
    }

    directionMenuProps = (): IContextualMenuProps => ({
        items: [
            {
                key: "LTR",
                text: intl.get("article.LTR"),
                iconProps: { iconName: "Forward" },
                canCheck: true,
                checked: this.props.source.textDir === SourceTextDirection.LTR,
                onClick: () =>
                    this.updateTextDirection(SourceTextDirection.LTR),
            },
            {
                key: "RTL",
                text: intl.get("article.RTL"),
                iconProps: { iconName: "Back" },
                canCheck: true,
                checked: this.props.source.textDir === SourceTextDirection.RTL,
                onClick: () =>
                    this.updateTextDirection(SourceTextDirection.RTL),
            },
            {
                key: "Vertical",
                text: intl.get("article.Vertical"),
                iconProps: { iconName: "Down" },
                canCheck: true,
                checked:
                    this.props.source.textDir === SourceTextDirection.Vertical,
                onClick: () =>
                    this.updateTextDirection(SourceTextDirection.Vertical),
            },
        ],
    })

    moreMenuProps = (): IContextualMenuProps => ({
        items: [
            {
                key: "openInBrowser",
                text: intl.get("openExternal"),
                iconProps: { iconName: "NavigateExternalInline" },
                onClick: e => {
                    window.utils.openExternal(
                        this.props.item.link,
                        platformCtrl(e)
                    )
                },
            },
            {
                key: "copyURL",
                text: intl.get("context.copyURL"),
                iconProps: { iconName: "Link" },
                onClick: () => {
                    window.utils.writeClipboard(this.props.item.link)
                },
            },
            {
                key: "toggleHidden",
                text: this.props.item.hidden
                    ? intl.get("article.unhide")
                    : intl.get("article.hide"),
                iconProps: {
                    iconName: this.props.item.hidden ? "View" : "Hide3",
                },
                onClick: () => {
                    this.props.toggleHidden(this.props.item)
                },
            },
            {
                key: "fontMenu",
                text: intl.get("article.font"),
                iconProps: { iconName: "Font" },
                disabled: this.state.loadWebpage,
                subMenuProps: this.fontFamilyMenuProps(),
            },
            {
                key: "fontSizeMenu",
                text: intl.get("article.fontSize"),
                iconProps: { iconName: "FontSize" },
                disabled: this.state.loadWebpage,
                subMenuProps: this.fontSizeMenuProps(),
            },
            {
                key: "directionMenu",
                text: intl.get("article.textDir"),
                iconProps: { iconName: "ChangeEntitlements" },
                disabled: this.state.loadWebpage,
                subMenuProps: this.directionMenuProps(),
            },
            {
                key: "divider_1",
                itemType: ContextualMenuItemType.Divider,
            },
            ...shareSubmenu(this.props.item),
        ],
    })

    contextMenuHandler = (pos: [number, number], text: string, url: string) => {
        if (pos) {
            if (text || url) this.props.textMenu(pos, text, url)
            else this.props.imageMenu(pos)
        } else {
            this.props.dismissContextMenu()
        }
    }

    keyDownHandler = (input: Electron.Input) => {
        if (input.type === "keyDown") {
            switch (input.key) {
                case "Escape":
                    this.props.dismiss()
                    break
                case "ArrowLeft":
                case "ArrowRight":
                    this.props.offsetItem(input.key === "ArrowLeft" ? -1 : 1)
                    break
                case "l":
                case "L":
                    this.toggleWebpage()
                    break
                case "w":
                case "W":
                    this.toggleFull()
                    break
                case "H":
                case "h":
                    if (!input.meta) this.props.toggleHidden(this.props.item)
                    break
                default:
                    const keyboardEvent = new KeyboardEvent("keydown", {
                        code: input.code,
                        key: input.key,
                        shiftKey: input.shift,
                        altKey: input.alt,
                        ctrlKey: input.control,
                        metaKey: input.meta,
                        repeat: input.isAutoRepeat,
                        bubbles: true,
                    })
                    this.props.shortcuts(this.props.item, keyboardEvent)
                    document.dispatchEvent(keyboardEvent)
                    break
            }
        }
    }

    webviewLoaded = () => {
        this.setState({ loaded: true })
        if (this.state.aiSummaryEnabled && !this.state.loadWebpage) {
            this.injectAIUI()

            // Auto generation logic
            const settings = window.settings.getAISettings()
            if (settings.autoSummary && this.state.aiSummary === "" && !this.state.aiLoading) {
                const content = this.state.loadFull ? this.state.fullContent : this.props.item.content
                const tmp = document.createElement("div")
                tmp.innerHTML = content
                const plainText = tmp.textContent || tmp.innerText || ""
                if (plainText.length > 500) {
                    this.generateSummary()
                }
            }

            // AI Translation logic
            if (settings.translateEnabled && Object.keys(this.state.aiTranslationMap).length === 0 && !this.state.aiTranslateLoading) {
                this.checkAndTranslate()
            }
        }
    }

    checkAndTranslate = async () => {
        const settings = window.settings.getAISettings()
        if (!settings.translateEnabled) {
            console.log("[AI Translate] Translation disabled in settings.")
            return
        }

        const content = this.state.loadFull ? this.state.fullContent : this.props.item.content
        const tmp = document.createElement("div")
        tmp.innerHTML = content
        const plainText = tmp.textContent || tmp.innerText || ""
        console.log(`[AI Translate] Article length: ${plainText.length}`)

        const lngDetector = new LanguageDetect()

        // Split text into chunks to check density
        const chunks = plainText.match(/[^.!?\n]+[.!?\n]*/g) || [plainText]
        const targetMap = {
            "zh": "chinese", "zh-CN": "chinese", "zh-TW": "chinese",
            "en": "english", "en-US": "english",
            "ja": "japanese", "ko": "korean",
            "fr": "french", "fr-FR": "french",
            "de": "german", "es": "spanish", "ru": "russian",
        }

        const targetLangCode = settings.targetLanguage || this.props.locale || "en-US"
        const targetName = targetMap[targetLangCode] || targetMap[targetLangCode.split("-")[0]]
        console.log(`[AI Translate] Target language code: ${targetLangCode}, target name: ${targetName}`)

        let nonTargetCount = 0
        let totalChecked = 0

        for (const chunk of chunks) {
            const trimmed = chunk.trim()
            if (trimmed.length < 20) continue
            totalChecked++
            const detected = lngDetector.detect(trimmed, 1)
            const topResult = detected[0]

            if (topResult) {
                // If detected language is not target and confidence is high enough
                if (topResult[0] !== targetName && topResult[1] > 0.1) {
                    nonTargetCount++
                    console.log(`[AI Translate] Chunk "${trimmed.substring(0, 30)}..." detected as ${topResult[0]} (conf: ${topResult[1].toFixed(2)}), not target.`)
                } else {
                    console.log(`[AI Translate] Chunk "${trimmed.substring(0, 30)}..." detected as ${topResult[0]} (conf: ${topResult[1].toFixed(2)}), matches target or low confidence.`)
                }
            } else {
                // If detection fails (common for CJK with this library)
                // If target is CJK, and detection failed, we assume it's NOT the target language
                // and thus needs translation. This is a simple strategy to trigger translation for CJK.
                if (targetName === "chinese" || targetName === "japanese" || targetName === "korean") {
                    nonTargetCount++
                    console.log(`[AI Translate] Chunk "${trimmed.substring(0, 30)}..." detection failed, target is CJK. Assuming non-target.`)
                } else {
                    // If detection fails and target is not CJK, also assume non-target.
                    nonTargetCount++
                    console.log(`[AI Translate] Chunk "${trimmed.substring(0, 30)}..." detection failed, target is non-CJK. Assuming non-target.`)
                }
            }
        }

        const nonTargetRatio = totalChecked > 0 ? nonTargetCount / totalChecked : 0
        console.log(`[AI Translate] Detection: target=${targetName}, ratio=${nonTargetRatio.toFixed(2)} (${nonTargetCount}/${totalChecked})`)

        if (nonTargetRatio > 0.2) {
            console.log("[AI Translate] Triggering translation...")
            this.performTranslation(tmp, targetLangCode)
        }
    }

    performTranslation = async (root: HTMLElement, targetLang: string) => {
        this.setState({ aiTranslateLoading: true })
        // Use the article tag if present, otherwise fallout to root
        const article = root.querySelector("article") || root
        const elements = article.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6")
        const jsonToTranslate: { [key: string]: string } = {}
        let count = 0

        elements.forEach((el, index) => {
            const text = el.textContent.trim()
            if (text.length > 10) {
                jsonToTranslate[index.toString()] = text
                count++
            }
        })

        if (count === 0) {
            this.setState({ aiTranslateLoading: false })
            return
        }

        const settings = window.settings.getAISettings()
        console.log(`[AI Translate] Calling API for ${count} elements...`)
        const resultJson = await window.utils.generateTranslation(settings, targetLang, JSON.stringify(jsonToTranslate))
        console.log(`[AI Translate] API Response length: ${resultJson.length}`)

        try {
            const translatedMap = JSON.parse(resultJson)
            console.log(`[AI Translate] Parsed map keys: ${Object.keys(translatedMap).length}`)
            this.setState({ aiTranslationMap: translatedMap, aiTranslateLoading: false }, () => {
                this.injectTranslationUI()
            })
        } catch (e) {
            console.error("Failed to parse translation result", e)
            this.setState({ aiTranslateLoading: false })
        }
    }

    injectTranslationUI = () => {
        const map = this.state.aiTranslationMap
        if (Object.keys(map).length === 0) return

        const script = `
            (function() {
                var article = document.querySelector("article");
                if (!article) {
                    console.log("[AI Translate Webview] No article tag found yet");
                    return;
                }
                var elements = article.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6");
                var map = ${JSON.stringify(map)};
                var injectedCount = 0;
                for (var index in map) {
                    var el = elements[parseInt(index)];
                    if (el && !el.nextElementSibling?.classList.contains("ai-translation")) {
                        var transEl = document.createElement(el.tagName === "LI" ? "div" : el.tagName);
                        transEl.className = "ai-translation";
                        transEl.innerText = map[index];
                        if (el.tagName === "LI") {
                            el.appendChild(transEl);
                        } else {
                            el.insertAdjacentElement('afterend', transEl);
                        }
                        injectedCount++;
                    }
                }
                console.log("[AI Translate Webview] Injected " + injectedCount + " translations");
            })();
        `
        this.webview.executeJavaScript(script)
    }

    injectAIUI = () => {
        const hasSummary = this.state.aiSummary.length > 0
        const buttonText = intl.get("article.generateAISummary")
        const loadingText = intl.get("article.generatingAISummary")
        const summaryTitle = intl.get("article.aiSummary")

        let summaryHtml = ""
        if (hasSummary) {
            try {
                summaryHtml = marked.parse(this.state.aiSummary) as string
            } catch (e) {
                summaryHtml = this.state.aiSummary
            }
        }

        const script = `
            (function() {
                var container = document.getElementById("ai-summary-container");
                if (!container) return;
                
                if (${hasSummary}) {
                    var html = ${JSON.stringify(summaryHtml)};
                    container.innerHTML = '<div class="ai-summary-card"><p class="ai-summary-title">${summaryTitle}</p><div class="ai-summary-content">' + html + '</div></div>';
                } else if (${this.state.aiLoading}) {
                    container.innerHTML = '<div class="ai-summary-loading"><span class="spinner"></span> ${loadingText}</div>';
                } else {
                    container.innerHTML = '<button id="generate-ai-btn" class="ai-btn">${buttonText}</button>';
                    document.getElementById("generate-ai-btn").onclick = function() {
                        console.log("EXECUTE_AI_SUMMARY");
                    };
                }
            })();
        `
        this.webview.executeJavaScript(script)
    }

    generateSummary = async () => {
        if (this.state.aiLoading) return
        const currentItemId = this.props.item._id
        this.setState({ aiLoading: true }, () => {
            this.injectAIUI()
        })

        const settings = window.settings.getAISettings()
        const targetLang = settings.targetLanguage || this.props.locale || "en-US"
        const title = this.props.item.title
        const content = this.state.loadFull ? this.state.fullContent : this.props.item.content

        // Strip HTML for the prompt
        const tmp = document.createElement("div")
        tmp.innerHTML = content
        const plainText = tmp.textContent || tmp.innerText || ""

        const summary = await window.utils.generateSummary(settings, title, plainText, targetLang)

        if (this.props.item._id === currentItemId) {
            this.setState({ aiSummary: summary, aiLoading: false }, () => {
                this.injectAIUI()
            })
        }
    }
    webviewError = (reason: string) => {
        this.setState({ error: true, errorDescription: reason })
    }
    webviewReload = () => {
        if (this.webview) {
            this.setState({ loaded: false, error: false })
            this.webview.reload()
        } else if (this.state.loadFull) {
            this.loadFull()
        }
    }

    componentDidMount = () => {
        let webview = document.getElementById("article") as Electron.WebviewTag
        if (webview != this.webview) {
            this.webview = webview
            if (webview) {
                webview.focus()
                this.setState({ loaded: false, error: false })
                webview.addEventListener("did-stop-loading", this.webviewLoaded)
                webview.addEventListener("console-message", (e) => {
                    if (e.message === "EXECUTE_AI_SUMMARY") {
                        this.generateSummary()
                    }
                })
                let card = document.querySelector(
                    `#refocus div[data-iid="${this.props.item._id}"]`
                ) as HTMLElement
                // @ts-ignore
                if (card) card.scrollIntoViewIfNeeded()
            }
        }
    }
    componentDidUpdate = (prevProps: ArticleProps) => {
        if (prevProps.item._id != this.props.item._id) {
            const settings = window.settings.getAISettings()
            this.setState({
                loadWebpage:
                    this.props.source.openTarget === SourceOpenTarget.Webpage,
                loadFull:
                    this.props.source.openTarget ===
                    SourceOpenTarget.FullContent,
                fullContent: "",
                loaded: false,
                error: false,
                aiSummary: "",
                aiLoading: false,
                aiSummaryEnabled: settings.enabled,
                aiTranslateLoading: false,
                aiTranslationMap: {},
            })
            if (this.props.source.openTarget === SourceOpenTarget.FullContent)
                this.loadFull()
        }
        this.componentDidMount()
    }

    componentWillUnmount = () => {
        let refocus = document.querySelector(
            `#refocus div[data-iid="${this.props.item._id}"]`
        ) as HTMLElement
        if (refocus) refocus.focus()
    }

    toggleWebpage = () => {
        if (this.state.loadWebpage) {
            this.setState({ loadWebpage: false })
        } else if (
            this.props.item.link.startsWith("https://") ||
            this.props.item.link.startsWith("http://")
        ) {
            this.setState({ loadWebpage: true, loadFull: false })
        }
    }

    toggleFull = () => {
        if (this.state.loadFull) {
            this.setState({ loadFull: false })
        } else if (
            this.props.item.link.startsWith("https://") ||
            this.props.item.link.startsWith("http://")
        ) {
            this.setState({ loadFull: true, loadWebpage: false })
            this.loadFull()
        }
    }
    loadFull = async () => {
        this.setState({ fullContent: "", loaded: false, error: false })
        const link = this.props.item.link
        try {
            const result = await fetch(link)
            if (!result || !result.ok) throw new Error()
            const html = await decodeFetchResponse(result, true)
            if (link === this.props.item.link) {
                this.setState({ fullContent: html })
            }
        } catch {
            if (link === this.props.item.link) {
                this.setState({
                    loaded: true,
                    error: true,
                    errorDescription: "MERCURY_PARSER_FAILURE",
                })
            }
        }
    }

    articleView = () => {
        const a = encodeURIComponent(
            this.state.loadFull
                ? this.state.fullContent
                : this.props.item.content
        )
        const h = encodeURIComponent(
            renderToString(
                <>
                    <p className="title">{this.props.item.title}</p>
                    <p className="date">
                        {this.props.item.date.toLocaleString(
                            this.props.locale,
                            { hour12: !this.props.locale.startsWith("zh") }
                        )}
                    </p>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .ai-btn { background: var(--primary); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; margin: 12px 0; display: block; }
                        .ai-btn:hover { background: var(--primary-alt); }
                        .ai-summary-card { background: #f3f2f1; padding: 12px; border-radius: 4px; border-left: 4px solid var(--primary); margin: 12px 0; font-size: 14px; line-height: 1.5; }
                        .ai-summary-content { word-break: break-word; }
                        .ai-summary-content p { margin-top: 0; }
                        .ai-summary-content p:last-child { margin-bottom: 0; }
                        .ai-summary-content ul, .ai-summary-content ol { padding-inline-start: 20px; }
                        .ai-summary-content code { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; }
                        @media (prefers-color-scheme: dark) { 
                            .ai-summary-card { background: #323130; } 
                            .ai-summary-content code { background: rgba(255,255,255,0.1); }
                        }
                        .ai-summary-title { font-weight: 600; margin-top: 0; margin-bottom: 8px; font-size: 12px; color: var(--gray); text-transform: uppercase; }
                        .ai-summary-loading { color: var(--gray); font-size: 13px; margin: 12px 0; }
                        .ai-translation { color: var(--primary); font-size: 0.9em; margin-top: 4px; border-left: 2px solid var(--primary-light); padding-left: 8px; opacity: 0.8; }
                        li .ai-translation { display: block; margin-top: 2px; border-left: none; padding-left: 0; font-style: italic; }
                    ` }} />
                    <div id="ai-summary-container"></div>
                    <article></article>
                </>
            )
        )
        return `article/article.html?a=${a}&h=${h}&f=${encodeURIComponent(
            this.state.fontFamily
        )}&s=${this.state.fontSize}&d=${this.props.source.textDir}&u=${this.props.item.link
            }&m=${this.state.loadFull ? 1 : 0}`
    }

    render = () => (
        <FocusZone className="article">
            <Stack horizontal style={{ height: 36 }}>
                <span style={{ width: 96 }}></span>
                <Stack
                    className="actions"
                    grow
                    horizontal
                    tokens={{ childrenGap: 12 }}>
                    <Stack.Item grow>
                        <span className="source-name">
                            {this.state.loaded ? (
                                this.props.source.iconurl && (
                                    <img
                                        className="favicon"
                                        src={this.props.source.iconurl}
                                    />
                                )
                            ) : (
                                <Spinner size={1} />
                            )}
                            {this.props.source.name}
                            {this.props.item.creator && (
                                <span className="creator">
                                    {this.props.item.creator}
                                </span>
                            )}
                        </span>
                    </Stack.Item>
                    <CommandBarButton
                        title={
                            this.props.item.hasRead
                                ? intl.get("article.markUnread")
                                : intl.get("article.markRead")
                        }
                        iconProps={
                            this.props.item.hasRead
                                ? { iconName: "StatusCircleRing" }
                                : {
                                    iconName: "RadioBtnOn",
                                    style: {
                                        fontSize: 14,
                                        textAlign: "center",
                                    },
                                }
                        }
                        onClick={() =>
                            this.props.toggleHasRead(this.props.item)
                        }
                    />
                    <CommandBarButton
                        title={
                            this.props.item.starred
                                ? intl.get("article.unstar")
                                : intl.get("article.star")
                        }
                        iconProps={{
                            iconName: this.props.item.starred
                                ? "FavoriteStarFill"
                                : "FavoriteStar",
                        }}
                        onClick={() =>
                            this.props.toggleStarred(this.props.item)
                        }
                    />
                    <CommandBarButton
                        title={intl.get("article.loadFull")}
                        className={this.state.loadFull ? "active" : ""}
                        iconProps={{ iconName: "RawSource" }}
                        onClick={this.toggleFull}
                    />
                    <CommandBarButton
                        title={intl.get("article.loadWebpage")}
                        className={this.state.loadWebpage ? "active" : ""}
                        iconProps={{ iconName: "Globe" }}
                        onClick={this.toggleWebpage}
                    />
                    <CommandBarButton
                        title={intl.get("more")}
                        iconProps={{ iconName: "More" }}
                        menuIconProps={{ style: { display: "none" } }}
                        menuProps={this.moreMenuProps()}
                    />
                </Stack>
                <Stack horizontal horizontalAlign="end" style={{ width: 112 }}>
                    <CommandBarButton
                        title={intl.get("close")}
                        iconProps={{ iconName: "BackToWindow" }}
                        onClick={this.props.dismiss}
                    />
                </Stack>
            </Stack>
            {(!this.state.loadFull || this.state.fullContent) && (
                <webview
                    id="article"
                    className={this.state.error ? "error" : ""}
                    key={
                        this.props.item._id +
                        (this.state.loadWebpage ? "_" : "") +
                        (this.state.loadFull ? "__" : "")
                    }
                    src={
                        this.state.loadWebpage
                            ? this.props.item.link
                            : this.articleView()
                    }
                    allowpopups={"true" as unknown as boolean}
                    webpreferences="contextIsolation,disableDialogs,autoplayPolicy=document-user-activation-required"
                    partition={this.state.loadWebpage ? "sandbox" : undefined}
                />
            )}
            {this.state.error && (
                <Stack
                    className="error-prompt"
                    verticalAlign="center"
                    horizontalAlign="center"
                    tokens={{ childrenGap: 12 }}>
                    <Icon iconName="HeartBroken" style={{ fontSize: 32 }} />
                    <Stack
                        horizontal
                        horizontalAlign="center"
                        tokens={{ childrenGap: 7 }}>
                        <small>{intl.get("article.error")}</small>
                        <small>
                            <Link onClick={this.webviewReload}>
                                {intl.get("article.reload")}
                            </Link>
                        </small>
                    </Stack>
                    <span style={{ fontSize: 11 }}>
                        {this.state.errorDescription}
                    </span>
                </Stack>
            )}
        </FocusZone>
    )
}

export default Article
