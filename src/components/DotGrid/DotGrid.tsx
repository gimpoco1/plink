import type { FC } from "react";
import "./DotGrid.css";
import type { DotGridProps } from "./dotGridTypes";
import { useDotGrid } from "./useDotGrid";

export type { DotGridProps } from "./dotGridTypes";

const DotGrid: FC<DotGridProps> = ({ className = "", style, ...props }) => {
  const { wrapperRef, canvasRef } = useDotGrid(props);
  return (
    <section className={`dot-grid ${className}`} style={style}>
      <div ref={wrapperRef} className="dot-grid__wrap">
        <canvas ref={canvasRef} className="dot-grid__canvas" />
      </div>
    </section>
  );
};

export default DotGrid;
