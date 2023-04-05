import type * as facemesh from "@tensorflow-models/facemesh";
import { ScatterGL } from 'scatter-gl';

import { TRIANGULATION } from "./Triangulation";

let scatterGL: ScatterGL;

function drawPath(ctx: CanvasRenderingContext2D, points: [number, number, number][], closePath: boolean) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

export function drawFaceMeshOnCanvas(
  predictions: facemesh.AnnotatedPrediction[],
  outputCanvas: HTMLCanvasElement | OffscreenCanvas,
  maxFaces = 2,
  triangulateMesh = true,
) {
  if (
    predictions.length > 0 &&
    outputCanvas &&
    outputCanvas instanceof HTMLCanvasElement
  ) {
    const state = {
      // backend: "wasm",
      maxFaces: maxFaces,
      triangulateMesh: triangulateMesh,
      renderPointcloud: undefined as boolean | undefined,
    };

    const ctx = outputCanvas.getContext("2d");
    if (ctx === null) return;

    let scatterGLHasInitialized = false;

    for (let index = 0; index < predictions.length; index++) {
      const prediction = predictions[index];
      const keypoints = prediction.scaledMesh as [number, number, number][]; // faceMesh Coords3D

      if (state.triangulateMesh) {
        for (let i = 0; i < TRIANGULATION.length / 3; i++) {
          const points = [
            TRIANGULATION[i * 3],
            TRIANGULATION[i * 3 + 1],
            TRIANGULATION[i * 3 + 2],
          ].map((index) => keypoints[index]);

          drawPath(ctx, points, true);
        }
      } else {
        for (let i = 0; i < keypoints.length; i++) {
          const x = keypoints[i][0];
          const y = keypoints[i][1];

          ctx.beginPath();
          ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    if (state.renderPointcloud && scatterGL != null) {
      const pointsData = predictions.map((prediction) => {
        const scaledMesh = prediction.scaledMesh as [number, number, number][];
        return scaledMesh.map((point) => [-point[0], -point[1], -point[2]]) as [number, number, number][];
      });

      let flattenedPointsData: [number, number, number][] = [];
      for (let i = 0; i < pointsData.length; i++) {
        flattenedPointsData = flattenedPointsData.concat(pointsData[i]);
      }
      const dataset = new ScatterGL.Dataset(flattenedPointsData);

      if (!scatterGLHasInitialized) {
        scatterGL.render(dataset);
      } else {
        scatterGL.updateDataset(dataset);
      }
      scatterGLHasInitialized = true;
    }
  }
}