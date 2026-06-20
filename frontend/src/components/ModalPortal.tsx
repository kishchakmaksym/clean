import { type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
    children: ReactNode;
};

export default function ModalPortal({ children }: ModalPortalProps) {
    return createPortal(children, document.body);
}
