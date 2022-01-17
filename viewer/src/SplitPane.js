import React, {
    createRef,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import SplitPaneContext from "./SplitPaneContext";

const SplitPane = ({ children, ...props }) => {
    const [clientHeight, setClientHeight] = useState(null);
    const [clientWidth, setClientWidth] = useState(null);
    const yDividerPos = useRef(null);
    const xDividerPos = useRef(null);

    return (
        <div {...props}>
            <SplitPaneContext.Provider
                value={{
                    clientHeight,
                    setClientHeight,
                    clientWidth,
                    setClientWidth,
                }}
            >
                {children}
            </SplitPaneContext.Provider>
        </div>
    );
};

export const Divider = (props) => {

    return <div {...props} />;
};

export const SplitPaneTop = (props) => {
    const topRef = createRef();
    const { clientHeight, setClientHeight } = useContext(SplitPaneContext);

    useEffect(() => {
        if (!clientHeight) {
            setClientHeight(topRef.current.clientHeight);
            return;
        }

        topRef.current.style.minHeight = clientHeight + "px";
        topRef.current.style.maxHeight = clientHeight + "px";
    }, [clientHeight]);

    return (
        <div {...props} className="split-pane-top" ref={topRef}>
            <h1>Famous quotes:</h1>
            <ul>
                <p>Hello</p>
            </ul>
        </div>
    );
};

export const SplitPaneBottom = (props) => {
    return (
        <div {...props} className="split-pane-bottom">
            Current <b>quote id</b>: World
        </div>
    );
};

export const SplitPaneLeft = (props) => {
    const topRef = createRef();
    return <div {...props} className="split-pane-left" ref={topRef} />;
};

export const SplitPaneRight = (props) => {
    const topRef = createRef();

    return <div {...props} className="split-pane-right" ref={topRef} />;
};

export default SplitPane;