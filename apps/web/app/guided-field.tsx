import {
  cloneElement,
  useId,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

type Control = ReactElement<{
  id?: string;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
}>;

export function GuidedField({
  label,
  hint,
  children,
  ...props
}: Omit<ComponentProps<"label">, "children"> & {
  label: ReactNode;
  hint: string;
  children: Control;
}) {
  const id = useId();
  const controlId = children.props.id ?? id + "-control";
  return (
    <label {...props} htmlFor={controlId}>
      <span id={id}>{label}</span>
      {cloneElement(children, {
        id: controlId,
        "aria-labelledby": id,
        "aria-describedby": id + "-help",
      })}
      <small className="field-guide" id={id + "-help"}>
        {hint}
      </small>
    </label>
  );
}
