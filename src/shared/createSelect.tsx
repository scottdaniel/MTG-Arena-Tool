import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createDiv } from "./dom-fns";

export interface ReactSelectProps {
    optionFormatter?: (option: string) => string | JSX.Element;
    current: string;
    callback: (option: string) => void;
    options: string[];
    divClass: string;
}

export function ReactSelect(props: ReactSelectProps) {
    const formatterFunc = typeof props.optionFormatter === "function" ? props.optionFormatter : (inString: string) => inString;

    const [currentOption, setCurrentOption] = React.useState(props.current);
    const [optionsOpen, setOptionsOpen] = React.useState(false);

    const onClickSelect = React.useCallback(() => {
        setOptionsOpen(!optionsOpen);
    }, [optionsOpen])

    const onClickOption = React.useCallback((event) => {
        setCurrentOption(event.currentTarget.value);
        setOptionsOpen(!optionsOpen);
        props.callback && props.callback(event.currentTarget.value);
    }, [props.callback, optionsOpen]);

    const buttonClassNames = "button_reset select_button" + (optionsOpen ? " active" : "")

    return(
        <div className={"select_container " + props.divClass}>
            <button className={buttonClassNames} onClick={onClickSelect}>
                {formatterFunc(currentOption)}
            </button>
            {optionsOpen && <div className={"select_options_container"}>
                {props.options.filter(option => option !== currentOption).map(option => {
                    return (
                        <button className={"button_reset select_option"} key={option} value={option} onClick={onClickOption}>
                            {formatterFunc(option)}
                        </button>
                    )
                })}
            </div>}
        </div>
    );
}

export function createSelect(
    parent: Element,
    options: string[],
    current: string,
    callback: (option: string) => void,
    divClass: string,
    optionFormatter?: (option: string) => string | JSX.Element,
): JSX.Element {
    const selectContainer = createDiv(["select_container", divClass]);
    selectContainer.id = divClass;
    parent.appendChild(selectContainer);
  
    const props = {
      options, current, optionFormatter, divClass, callback,
    }
  
    ReactDOM.render(
      <ReactSelect {...props} />,
      selectContainer
    );
  
    return selectContainer;
}