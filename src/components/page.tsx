import * as React from "react"
import { FeedContainer } from "../containers/feed-container"
import { AnimationClassNames, Icon, FocusTrapZone } from "@fluentui/react"
import ArticleContainer from "../containers/article-container"
import { ViewType } from "../schema-types"
import ArticleSearch from "./utils/article-search"

type PageProps = {
    menuOn: boolean
    contextOn: boolean
    settingsOn: boolean
    feeds: string[]
    itemId: number
    itemFromFeed: boolean
    viewType: ViewType
    dismissItem: () => void
    offsetItem: (offset: number) => void
}

type PageState = {
    listViewWidth: number
}

class Page extends React.Component<PageProps, PageState> {
    constructor(props: PageProps) {
        super(props)
        this.state = {
            listViewWidth: window.settings.getListViewWidth(),
        }
    }

    resizing = false

    onResizeStart = (event: React.MouseEvent) => {
        event.preventDefault()
        this.resizing = true
        document.addEventListener("mousemove", this.onResizing)
        document.addEventListener("mouseup", this.onResizeEnd)
        document.body.style.cursor = "col-resize"
    }

    onResizing = (event: MouseEvent) => {
        if (!this.resizing) return
        let offset = this.props.menuOn ? 280 : 0
        if (window.innerWidth >= 1440 && this.props.menuOn) {
            // menu is fixed
        } else if (this.props.menuOn) {
            // menu is overlay? No, check main.css
        }

        // Actually, the mouse position is absolute.
        // list-main margin-left is 280 when menu-on and width >= 1440
        let leftBoundary = 0
        if (window.innerWidth >= 1440 && this.props.menuOn) {
            leftBoundary = 280
        }

        let newWidth = event.clientX - leftBoundary
        if (newWidth < 200) newWidth = 200
        if (newWidth > 600) newWidth = 600
        this.setState({ listViewWidth: newWidth })
    }

    onResizeEnd = () => {
        this.resizing = false
        document.removeEventListener("mousemove", this.onResizing)
        document.removeEventListener("mouseup", this.onResizeEnd)
        document.body.style.cursor = "unset"
        window.settings.setListViewWidth(this.state.listViewWidth)
    }

    offsetItem = (event: React.MouseEvent, offset: number) => {
        event.stopPropagation()
        this.props.offsetItem(offset)
    }
    prevItem = (event: React.MouseEvent) => this.offsetItem(event, -1)
    nextItem = (event: React.MouseEvent) => this.offsetItem(event, 1)

    render = () =>
        this.props.viewType !== ViewType.List ? (
            <>
                {this.props.settingsOn ? null : (
                    <div
                        key="card"
                        className={
                            "main" + (this.props.menuOn ? " menu-on" : "")
                        }>
                        <ArticleSearch />
                        {this.props.feeds.map(fid => (
                            <FeedContainer
                                viewType={this.props.viewType}
                                feedId={fid}
                                key={fid + this.props.viewType}
                            />
                        ))}
                    </div>
                )}
                {this.props.itemId && (
                    <FocusTrapZone
                        disabled={this.props.contextOn}
                        ignoreExternalFocusing={true}
                        isClickableOutsideFocusTrap={true}
                        className="article-container"
                        onClick={this.props.dismissItem}>
                        <div
                            className="article-wrapper"
                            onClick={e => e.stopPropagation()}>
                            <ArticleContainer itemId={this.props.itemId} />
                        </div>
                        {this.props.itemFromFeed && (
                            <>
                                <div className="btn-group prev">
                                    <a className="btn" onClick={this.prevItem}>
                                        <Icon iconName="Back" />
                                    </a>
                                </div>
                                <div className="btn-group next">
                                    <a className="btn" onClick={this.nextItem}>
                                        <Icon iconName="Forward" />
                                    </a>
                                </div>
                            </>
                        )}
                    </FocusTrapZone>
                )}
            </>
        ) : (
            <>
                {this.props.settingsOn ? null : (
                    <div
                        key="list"
                        className={
                            "list-main" + (this.props.menuOn ? " menu-on" : "")
                        }>
                        <ArticleSearch
                            style={{ maxWidth: this.state.listViewWidth - 20 }}
                        />
                        <div
                            className="list-feed-container"
                            style={{ width: this.state.listViewWidth }}>
                            {this.props.feeds.map(fid => (
                                <FeedContainer
                                    viewType={this.props.viewType}
                                    feedId={fid}
                                    key={fid}
                                />
                            ))}
                        </div>
                        <div
                            className="list-resizer"
                            onMouseDown={this.onResizeStart}
                        />
                        {this.props.itemId ? (
                            <div className="side-article-wrapper">
                                <ArticleContainer itemId={this.props.itemId} />
                            </div>
                        ) : (
                            <div className="side-logo-wrapper">
                                <img
                                    className="light"
                                    src="icons/logo-outline.svg"
                                />
                                <img
                                    className="dark"
                                    src="icons/logo-outline-dark.svg"
                                />
                            </div>
                        )}
                    </div>
                )}
            </>
        )
}

export default Page
