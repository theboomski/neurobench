"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type UgcImageCardProps = {
  src: string;
  alt: string;
  size?: number;
  priority?: boolean;
  style?: CSSProperties;
  borderRadius?: number;
};

const NEUTRAL_FILL = "#1a1a1a";

export default function UgcImageCard({ src, alt, size: _size = 640, priority = false, style, borderRadius = 12 }: UgcImageCardProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loaded = loadedSrc === src;

  // Cached images often never fire `onLoad` after the listener is attached (e.g. full page reload / Play Again).
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) setLoadedSrc(src);
    else setLoadedSrc(null);
  }, [src]);

  const imageStyle: CSSProperties = {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius,
    overflow: "hidden",
    position: "relative",
    background: NEUTRAL_FILL,
    ...style,
  };

  return (
    <div style={imageStyle}>
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            borderRadius,
            background: "linear-gradient(120deg, rgba(32,32,32,0.92), rgba(48,48,48,0.96), rgba(32,32,32,0.92))",
            backgroundSize: "200% 100%",
            animation: "ugc-skeleton 1.2s ease-in-out infinite",
          }}
        />
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          zIndex: 1,
          backgroundColor: NEUTRAL_FILL,
          userSelect: "none",
        }}
        onLoad={() => setLoadedSrc(src)}
        onError={() => setLoadedSrc(src)}
      />

      <style jsx>{`
        @keyframes ugc-skeleton {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
}
