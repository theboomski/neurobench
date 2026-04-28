"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type UgcImageCardProps = {
  src: string;
  alt: string;
  size?: number;
  priority?: boolean;
  style?: CSSProperties;
  borderRadius?: number;
};

const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#0f172a" offset="20%" />
      <stop stop-color="#1e293b" offset="50%" />
      <stop stop-color="#0f172a" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#0b1220" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.1s" repeatCount="indefinite" />
</svg>`;

const toBase64 = (str: string) => (typeof window === "undefined" ? Buffer.from(str).toString("base64") : window.btoa(str));

export default function UgcImageCard({ src, alt, size = 640, priority = false, style, borderRadius = 12 }: UgcImageCardProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const imageStyle: CSSProperties = {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius,
    overflow: "hidden",
    position: "relative",
    background: "#020617",
    ...style,
  };

  return (
    <div style={imageStyle}>
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            borderRadius,
            background: "linear-gradient(120deg, rgba(15,23,42,0.85), rgba(30,41,59,0.95), rgba(15,23,42,0.85))",
            backgroundSize: "200% 100%",
            animation: "ugc-skeleton 1.2s ease-in-out infinite",
          }}
        />
      )}

      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 768px) 48vw, 640px"
        priority={priority}
        quality={72}
        loading={priority ? "eager" : "lazy"}
        unoptimized={false}
        placeholder="blur"
        blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(64, 64))}`}
        style={{
          objectFit: "cover",
          filter: "blur(18px) brightness(0.42)",
          transform: "scale(1.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(2,6,23,0.04), rgba(2,6,23,0.28))",
          zIndex: 2,
        }}
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 48vw, 640px"
        priority={priority}
        quality={72}
        loading={priority ? "eager" : "lazy"}
        unoptimized={false}
        placeholder="blur"
        blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(64, 64))}`}
        style={{
          objectFit: "contain",
          zIndex: 3,
        }}
        onLoad={() => setLoaded(true)}
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
