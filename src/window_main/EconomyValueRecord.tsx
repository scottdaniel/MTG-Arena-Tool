import React from "react";

interface EconomyValueRecordProps {
  deltaUpContent?: string,
  title: string;
  className?: string;
  deltaDownContent?: string,
  deltaContent?: string,
  iconClassName?: string,
  containerDiv?: boolean,
  smallLabel?: boolean,
  iconUrl?: string, 
}

export default function EconomyValueRecord(props: EconomyValueRecordProps) {
  const contents = (
    <>
      {props.iconClassName && <EconomyIcon className={props.iconClassName} title={props.title} url={props.iconUrl}/>}
      {props.deltaContent && (
        <DeltaLabel smallLabel={props.smallLabel} content={props.deltaContent} />
      )}
      {props.deltaUpContent && (
        <div className={"economy_delta upConta"}>
          <DeltaLabel content={props.deltaUpContent}/>
          <UpConta />
        </div>
      )}
      {props.deltaDownContent && (
        <div className={"economy_delta downConta"}>
          <DeltaLabel content={props.deltaDownContent}/>
          <DownConta />
        </div>
      )}
    </>
  )
  return (
    props.containerDiv ? (
      <div className={"economy_metric"}>
        {contents}
      </div>
  ) : (
    <>
      {contents}
    </>
  ));
}

function DeltaLabel(props: { content: string, smallLabel?: boolean }) {
  return (
    <div className={"economy_sub" + (props.smallLabel ? " small" : "")} >
      {props.content}
    </div>
  );
}

function UpConta() {
  return (
    <div className={"economy_up"} title={"increase"} />
  )
}

function DownConta() {
  return (
    <div className={"economy_down"} title={"decrease"} />
  )
}

interface EconomyIconProps {
  title: string;
  className: string;
  url?: string;
}

export function EconomyIcon(props: EconomyIconProps) {
  return (
    <div className={props.className} style={props.url ? { backgroundImage: props.url } : undefined }title={props.title} />
  )
}