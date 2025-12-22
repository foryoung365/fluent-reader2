import * as React from "react"
import intl from "react-intl-universal"
import {
    urlTest,
    byteToMB,
    calculateItemSize,
    getSearchEngineName,
} from "../../scripts/utils"
import { ThemeSettings, SearchEngines, AIProvider, AISettings } from "../../schema-types"
import {
    getThemeSettings,
    setThemeSettings,
    exportAll,
} from "../../scripts/settings"
import {
    Stack,
    Label,
    Toggle,
    TextField,
    DefaultButton,
    ChoiceGroup,
    IChoiceGroupOption,
    Dropdown,
    IDropdownOption,
    PrimaryButton,
} from "@fluentui/react"
import DangerButton from "../utils/danger-button"

type AppTabProps = {
    setLanguage: (option: string) => void
    setFetchInterval: (interval: number) => void
    deleteArticles: (days: number) => Promise<void>
    importAll: () => Promise<void>
    setSortDirection: (direction: number) => void
}

type AppTabState = {
    pacStatus: boolean
    pacUrl: string
    themeSettings: ThemeSettings
    itemSize: string
    cacheSize: string
    deleteIndex: string
    sortDirection: number
    aiSettings: AISettings
    testResult: string
}

class AppTab extends React.Component<AppTabProps, AppTabState> {
    constructor(props) {
        super(props)
        this.state = {
            pacStatus: window.settings.getProxyStatus(),
            pacUrl: window.settings.getProxy(),
            themeSettings: getThemeSettings(),
            itemSize: null,
            cacheSize: null,
            deleteIndex: null,
            sortDirection: window.settings.getSortDirection(),
            aiSettings: window.settings.getAISettings(),
            testResult: "",
        }
        this.getItemSize()
        this.getCacheSize()
    }

    getCacheSize = () => {
        window.utils.getCacheSize().then(size => {
            this.setState({ cacheSize: byteToMB(size) })
        })
    }
    getItemSize = () => {
        calculateItemSize().then(size => {
            this.setState({ itemSize: byteToMB(size) })
        })
    }

    clearCache = () => {
        window.utils.clearCache().then(() => {
            this.getCacheSize()
        })
    }

    themeChoices = (): IChoiceGroupOption[] => [
        { key: ThemeSettings.Default, text: intl.get("followSystem") },
        { key: ThemeSettings.Light, text: intl.get("app.lightTheme") },
        { key: ThemeSettings.Dark, text: intl.get("app.darkTheme") },
    ]

    fetchIntervalOptions = (): IDropdownOption[] => [
        { key: 0, text: intl.get("app.never") },
        { key: 10, text: intl.get("time.minute", { m: 10 }) },
        { key: 15, text: intl.get("time.minute", { m: 15 }) },
        { key: 20, text: intl.get("time.minute", { m: 20 }) },
        { key: 30, text: intl.get("time.minute", { m: 30 }) },
        { key: 45, text: intl.get("time.minute", { m: 45 }) },
        { key: 60, text: intl.get("time.hour", { h: 1 }) },
    ]
    onFetchIntervalChanged = (item: IDropdownOption) => {
        this.props.setFetchInterval(item.key as number)
    }

    sortDirectionOptions = (): IDropdownOption[] => [
        { key: 0, text: intl.get("app.newestFirst") },
        { key: 1, text: intl.get("app.oldestFirst") },
    ]
    onSortDirectionChanged = (item: IDropdownOption) => {
        this.props.setSortDirection(item.key as number)
        this.setState({ sortDirection: item.key as number })
    }

    searchEngineOptions = (): IDropdownOption[] =>
        [
            SearchEngines.Google,
            SearchEngines.Bing,
            SearchEngines.Baidu,
            SearchEngines.DuckDuckGo,
        ].map(engine => ({
            key: engine,
            text: getSearchEngineName(engine),
        }))
    onSearchEngineChanged = (item: IDropdownOption) => {
        window.settings.setSearchEngine(item.key as number)
    }

    deleteOptions = (): IDropdownOption[] => [
        { key: "7", text: intl.get("app.daysAgo", { days: 7 }) },
        { key: "14", text: intl.get("app.daysAgo", { days: 14 }) },
        { key: "21", text: intl.get("app.daysAgo", { days: 21 }) },
        { key: "28", text: intl.get("app.daysAgo", { days: 28 }) },
        { key: "0", text: intl.get("app.deleteAll") },
    ]

    deleteChange = (_, item: IDropdownOption) => {
        this.setState({ deleteIndex: item ? String(item.key) : null })
    }

    confirmDelete = () => {
        this.setState({ itemSize: null })
        this.props
            .deleteArticles(parseInt(this.state.deleteIndex))
            .then(() => this.getItemSize())
    }

    languageOptions = (): IDropdownOption[] => [
        { key: "default", text: intl.get("followSystem") },
        { key: "de", text: "Deutsch" },
        { key: "en-US", text: "English" },
        { key: "es", text: "Español" },
        { key: "cs", text: "Čeština" },
        { key: "fr-FR", text: "Français" },
        { key: "it", text: "Italiano" },
        { key: "nl", text: "Nederlands" },
        { key: "pt-BR", text: "Português do Brasil" },
        { key: "pt-PT", text: "Português de Portugal" },
        { key: "fi-FI", text: "Suomi" },
        { key: "sv", text: "Svenska" },
        { key: "tr", text: "Türkçe" },
        { key: "uk", text: "Українська" },
        { key: "ru", text: "Русский" },
        { key: "ko", text: "한글" },
        { key: "ja", text: "日本語" },
        { key: "zh-CN", text: "中文（简体）" },
        { key: "zh-TW", text: "中文（繁體）" },
    ]

    toggleStatus = () => {
        window.settings.toggleProxyStatus()
        this.setState({
            pacStatus: window.settings.getProxyStatus(),
            pacUrl: window.settings.getProxy(),
        })
    }

    handleInputChange = event => {
        const name: string = event.target.name
        // @ts-ignore
        this.setState({ [name]: event.target.value.trim() })
    }

    setUrl = (event: React.FormEvent) => {
        event.preventDefault()
        if (urlTest(this.state.pacUrl))
            window.settings.setProxy(this.state.pacUrl)
    }

    onThemeChange = (_, option: IChoiceGroupOption) => {
        setThemeSettings(option.key as ThemeSettings)
        this.setState({ themeSettings: option.key as ThemeSettings })
    }

    aiProviderOptions = (): IDropdownOption[] => [
        { key: AIProvider.OpenAI, text: "OpenAI / Compatible" },
        { key: AIProvider.Gemini, text: "Gemini" },
        { key: AIProvider.Custom, text: "Custom" },
    ]

    onAISettingsChange = (newSettings: Partial<AISettings>) => {
        const aiSettings = { ...this.state.aiSettings, ...newSettings }
        window.settings.setAISettings(aiSettings)
        this.setState({ aiSettings, testResult: "" })
    }

    onTestAIConnection = async () => {
        this.setState({ testResult: "..." })
        const res = await window.utils.testAISettings(this.state.aiSettings)
        if (res.success) {
            this.setState({ testResult: intl.get("app.testSuccess") })
        } else {
            this.setState({ testResult: intl.get("app.testFailure", { message: res.message }) })
        }
    }

    render = () => (
        <div className="tab-body">
            <Label>{intl.get("app.language")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getLocaleSettings()}
                        options={this.languageOptions()}
                        onChanged={option =>
                            this.props.setLanguage(String(option.key))
                        }
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <ChoiceGroup
                label={intl.get("app.theme")}
                options={this.themeChoices()}
                onChange={this.onThemeChange}
                selectedKey={this.state.themeSettings}
            />

            <Label>{intl.get("app.fetchInterval")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getFetchInterval()}
                        options={this.fetchIntervalOptions()}
                        onChanged={this.onFetchIntervalChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Label>{intl.get("app.articleSorting")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={this.state.sortDirection}
                        options={this.sortDirectionOptions()}
                        onChanged={this.onSortDirectionChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Label>{intl.get("searchEngine.name")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getSearchEngine()}
                        options={this.searchEngineOptions()}
                        onChanged={this.onSearchEngineChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Stack horizontal verticalAlign="baseline">
                <Stack.Item grow>
                    <Label>{intl.get("app.enableProxy")}</Label>
                </Stack.Item>
                <Stack.Item>
                    <Toggle
                        checked={this.state.pacStatus}
                        onChange={this.toggleStatus}
                    />
                </Stack.Item>
            </Stack>
            {this.state.pacStatus && (
                <form onSubmit={this.setUrl}>
                    <Stack horizontal>
                        <Stack.Item grow>
                            <TextField
                                required
                                onGetErrorMessage={v =>
                                    urlTest(v.trim())
                                        ? ""
                                        : intl.get("app.badUrl")
                                }
                                placeholder={intl.get("app.pac")}
                                name="pacUrl"
                                onChange={this.handleInputChange}
                                value={this.state.pacUrl}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <DefaultButton
                                disabled={!urlTest(this.state.pacUrl)}
                                type="sumbit"
                                text={intl.get("app.setPac")}
                            />
                        </Stack.Item>
                    </Stack>
                    <span className="settings-hint up">
                        {intl.get("app.pacHint")}
                    </span>
                </form>
            )}

            <Stack horizontal verticalAlign="baseline">
                <Stack.Item grow>
                    <Label>{intl.get("app.enableAISummary")}</Label>
                </Stack.Item>
                <Stack.Item>
                    <Toggle
                        checked={this.state.aiSettings.enabled}
                        onChange={(_, checked) => this.onAISettingsChange({ enabled: checked })}
                    />
                </Stack.Item>
            </Stack>

            {this.state.aiSettings.enabled && (
                <Stack tokens={{ childrenGap: 8 }} style={{ marginBottom: 16 }}>
                    <Label>{intl.get("app.aiProvider")}</Label>
                    <Dropdown
                        selectedKey={this.state.aiSettings.provider}
                        options={this.aiProviderOptions()}
                        onChanged={opt => this.onAISettingsChange({ provider: opt.key as AIProvider })}
                        style={{ width: 200 }}
                    />
                    <TextField
                        label={intl.get("app.aiApiKey")}
                        type="password"
                        value={this.state.aiSettings.apiKey}
                        onChange={(_, val) => this.onAISettingsChange({ apiKey: val })}
                    />
                    <TextField
                        label={intl.get("app.aiApiUrl")}
                        placeholder="https://api.openai.com/v1"
                        value={this.state.aiSettings.apiUrl}
                        onChange={(_, val) => this.onAISettingsChange({ apiUrl: val })}
                    />
                    <TextField
                        label={intl.get("app.aiModel")}
                        placeholder="gpt-3.5-turbo"
                        value={this.state.aiSettings.model}
                        onChange={(_, val) => this.onAISettingsChange({ model: val })}
                    />
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
                        <DefaultButton
                            text={intl.get("app.testConnection")}
                            onClick={this.onTestAIConnection}
                            disabled={this.state.testResult === "..."}
                        />
                        {this.state.testResult && (
                            <span className="settings-hint" style={{ margin: 0 }}>
                                {this.state.testResult}
                            </span>
                        )}
                    </Stack>
                    <span className="settings-hint">
                        {intl.get("app.aiHint")}
                    </span>
                </Stack>
            )}

            <Label>{intl.get("app.cleanup")}</Label>
            <Stack horizontal>
                <Stack.Item grow>
                    <Dropdown
                        placeholder={intl.get("app.deleteChoices")}
                        options={this.deleteOptions()}
                        selectedKey={this.state.deleteIndex}
                        onChange={this.deleteChange}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DangerButton
                        disabled={
                            this.state.itemSize === null ||
                            this.state.deleteIndex === null
                        }
                        text={intl.get("app.confirmDelete")}
                        onClick={this.confirmDelete}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {this.state.itemSize
                    ? intl.get("app.itemSize", { size: this.state.itemSize })
                    : intl.get("app.calculatingSize")}
            </span>
            <Stack horizontal>
                <Stack.Item>
                    <DefaultButton
                        text={intl.get("app.cache")}
                        disabled={
                            this.state.cacheSize === null ||
                            this.state.cacheSize === "0MB"
                        }
                        onClick={this.clearCache}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {this.state.cacheSize
                    ? intl.get("app.cacheSize", { size: this.state.cacheSize })
                    : intl.get("app.calculatingSize")}
            </span>

            <Label>{intl.get("app.data")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <PrimaryButton
                        onClick={exportAll}
                        text={intl.get("app.backup")}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DefaultButton
                        onClick={this.props.importAll}
                        text={intl.get("app.restore")}
                    />
                </Stack.Item>
            </Stack>
        </div>
    )
}

export default AppTab
