import React from 'react';
import { ReactSelect, ReactSelectProps } from '../shared/createSelect';

export interface DateFilterProps extends ReactSelectProps {
    prefixId: string;
    showArchivedFilter?: boolean;
    onArchiveClick?: (newValue: boolean) => void;
    className?: string;
}

export default function DateFilter(props: DateFilterProps) {
    const [ showArchived, onSetShowArchived ] = React.useState(false);
    const { onArchiveClick, prefixId, showArchivedFilter, ...selectProps } = props;
    
    const onClickArchiveCheckbox = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.currentTarget.checked;
        if (newValue != showArchived) {
            onSetShowArchived(newValue);
            onArchiveClick && onArchiveClick(newValue);
        }
    }, [onArchiveClick, showArchived]);
    
    return (
      <div className={props.className + " dateCont"}>
        <div className={"select_container filter_panel_select_margin " + prefixId + "_query_date"}>
            <ReactSelect {...selectProps} />
        </div>
        {showArchivedFilter && (
          <label className={"archive_label check_container hover_label"}>
            {"archived"}
            <input type={"checkbox"} id={prefixId + "_query_archived"} checked={showArchived} onChange={onClickArchiveCheckbox}></input>
            <span className={"checkmark"} />
          </label>
        )}
      </div>
    )
}