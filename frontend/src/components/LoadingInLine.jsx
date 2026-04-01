
import React from "react";

export default function LoadingInline({ text = "Loading..." }) {
  return <div className="small-muted">{text}</div>;
}
