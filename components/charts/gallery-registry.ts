// Chart agents append entries here; app/(dev)/gallery renders every entry in both frames.
// Keep this file free of JSX (it is .ts): build nodes with createElement or import a component and call it.
import type { ReactNode } from "react";

export interface GalleryEntry {
  title: string;
  wide: ReactNode;
  half: ReactNode;
}

export const GALLERY: { title: string; wide: ReactNode; half: ReactNode }[] = [];
