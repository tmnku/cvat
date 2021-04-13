import React from 'react';
import { CombinedState, ObjectType } from 'reducers/interfaces';
import { connect } from 'react-redux';
import { Matrix, matrix, dot, transpose, multiply, inv, subset, index, abs } from 'mathjs';
import { ColorBy } from 'reducers/interfaces';

import './canvas-container.css';

interface Props {
    activeLabelID: number;
    frameData: any;
    annotations: any[];
    camera: string;
    colorBy: ColorBy;
}

function mapStateToProps(state: CombinedState): Props {
    const {
        annotation: {
            canvas: { activeControl, instance: canvasInstance },
            drawing: { activeLabelID, activeObjectType },
            player: {
                frame: { data: frameData, number: frame, fetching: frameFetching },
                frameAngles,
            },
            annotations: {
                states: annotations,
                activatedStateID,
                activatedAttributeID,
                selectedStatesID,
                zLayer: { cur: curZLayer, min: minZLayer, max: maxZLayer },
            },
        },
        settings: {
            shapes: {
                colorBy,
            },
        },
    } = state;

    return {
        activeLabelID,
        frameData,
        annotations,
        colorBy,
    };
}

class LeftCameraImages extends React.PureComponent<Props> {
    canvas: HTMLDivElement;
    background: HTMLCanvasElement;
    overlay: HTMLCanvasElement;
    content: SVGSVGElement;
    image: Image | null;
    depth: Image | null;
    name: string;
    depthCanvas: HTMLCanvasElement;
    depthCtx: any;
    C: Matrix;
    edgeTable: number[][];
    vertexTable: number[][];


    constructor(props: Props) {
        super(props);

        this.canvas = window.document.createElement('div');
        this.canvas.classList.add('cvat-side-image-container');
        this.background = window.document.createElement('canvas');
        this.canvas.appendChild(this.background);
        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.overlay = window.document.createElement('canvas');
        this.canvas.appendChild(this.overlay);

        this.background.classList.add('cvat-side-image-canvas');
        this.overlay.classList.add('cvat-side-image-canvas');

        this.image = null;
        this.depth = null;
        this.depthCanvas = document.createElement('canvas');
        this.depthCtx = this.depthCanvas.getContext('2d');
        this.C = null;

        let canvasWidth = 300;
        this.background.width = canvasWidth;
        this.overlay.width = canvasWidth;

        this.name = `cvat-side-image-div-${props.camera}`;

        // each entry contains two vertex indices for one edge. first vertex is top left of box and indices continue counter clock wise
        this.edgeTable = [[0,1], [1,2], [2,3], [3,0], // lower edges
                          [4,5], [5,6], [6,7], [7,4], // upper edges
                          [0,4], [1,5], [2,6], [3,7], // vertical edges
                        ];
        // normalized vertex positions in vehicle coordinates. scale each entry with [length, width, height]/2 to get absolute coords
        this.vertexTable = [[1,1,-1], [-1,1,-1], [-1,-1,-1], [1,-1,-1], // lower vertices
                            [1,1,1], [-1,1,1], [-1,-1,1], [1,-1,1], // upper vertices
                        ];
    }

    drawBox(x0: number, y0: number, x1: number, y1: number, color: string) {
        let ctx = this.overlay.getContext('2d');
        if (ctx) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = color;

            let length = abs(x1-x0);
            let width = abs(y1-y0);
            let height = 2;

            let posX = (x0+x1)/2;
            let posY = (y0+y1)/2;
            let depth = this.getDepthAt(posX, posY);

            let uvs = [];
            for (const vertex of this.vertexTable) {
                const p = this.bevToVehicleCoords(posX+vertex[0]*length, posY+vertex[1]*width, depth-height*vertex[2]);
                const uv = this.projectPoint(p);
                uvs.push(uv);
            }

            // draw edges
            ctx.beginPath();
            for (const edge of this.edgeTable) {
                const pixStart = uvs[edge[0]];
                const pixEnd = uvs[edge[1]];
                if (pixStart && pixEnd) {
                    ctx.moveTo(...pixStart);
                    ctx.lineTo(...pixEnd);
                }
            }
            ctx.stroke();
        }
    }

    getDepthAt(x: number, y: number): number {
        let pixel = this.depthCtx.getImageData(x, y, 1, 1).data;
        let normalized = (pixel[0] + pixel[1] * 256 + pixel[2] * 256 * 256) / (256 * 256 * 256 - 1);
        let in_meters = 1000 * normalized;
        return in_meters;
    }

    projectPoint(p: Matrix) : number[] | null {
        let uvw = multiply(this.C, p);
        let w = uvw.get([2, 0]);
        // check point behind camera
        if (w < 0) {
            return null;
        }
        let u = uvw.get([0, 0]) / w;
        let v = uvw.get([1, 0]) / w;
        // scale to canvas size
        return [u / this.image.width * this.overlay.width, v / this.image.height * this.overlay.height];
    }

    bevToVehicleCoords(x: number, y: number, depth: number): Matrix {
        let px_to_meters = 100.0/this.depth.width;
        // compute points in vehicle coordinates (x forward, y left, z up)
        let x_w = -(y-this.depth.height/2)*px_to_meters;
        let y_w = -(x-this.depth.width/2)*px_to_meters;
        let z_w = 50-depth;
        let p = matrix([[x_w],[y_w],[z_w],[1]]);
        return p;
    }

    // pixelToVehicleCoords()

    // NOTE: this function has to be called after images are drawn
    public drawBoxes() {
        // see https://eloquentjavascript.net/17_canvas.html
        let ctx = this.overlay.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
        }

        let annotations = this.props.annotations.filter((e) => e.objectType !== ObjectType.TAG);
        for (const state of annotations) {
            let shapeColor = '';
            if (this.props.colorBy === ColorBy.INSTANCE) {
                shapeColor = state.color;
            } else if (this.props.colorBy === ColorBy.GROUP) {
                shapeColor = state.group.color;
            } else if (this.props.colorBy === ColorBy.LABEL) {
                shapeColor = state.label.color;
            }

            this.drawBox(...state.points, shapeColor);

            // let x_i = state.points[0];
            // let y_i = state.points[1];
            // let depth = this.getDepthAt(x_i, y_i);

            // let p = this.bevToVehicleCoords(x_i, y_i, depth);

            // const uv = this.projectPoint(p);
            // if (uv) {
            //     // scale coordinates to scaled image size
            //     let x = uv[0] / this.image.width * this.overlay.width;
            //     let y = uv[1] / this.image.height * this.overlay.height;
            //     ctx.strokeRect(x, y, 5, 5);
            // }
        }

    }

    // TODO fetch data once outside this class
    public async onFrameChange() {
        // fetch calibration file
        let calib = await this.props.frameData.getCalibFile();
        let K = matrix(calib[this.props.camera].K);
        let camera_pose = matrix(calib[this.props.camera].pose);
        let depth_pose = matrix(calib.depth.pose); // FIXME for now we use hard coded position of 50m above vehicle
        let vehicle_to_cam = matrix([[0,-1,0,0], [0,0,-1,0], [1,0,0,0], [0,0,0,1]]);

        // compute camera matrix which projects from point in vehicle coordinates into camera image
        let Rt = multiply(vehicle_to_cam, inv(camera_pose));
        this.C = multiply(K, Rt.subset(index([0, 1, 2], [0, 1, 2, 3])));

        // fetch depth image
        let depth = await this.props.frameData.getCameraImage('depth');
        this.depth = new Image();
        this.depth.onload = () => {
            this.depthCanvas.width = this.depth.width;
            this.depthCanvas.height = this.depth.height;
            this.depthCtx.drawImage(this.depth, 0, 0);
        };
        this.depth.src = depth;

        // fetch camera image
        let image = await this.props.frameData.getCameraImage(this.props.camera);
        this.image = new Image()
        this.image.onload = () => {
            let ratio = this.image.height / this.image.width;
            let targetHeight = ratio * this.background.width;
            this.background.height = targetHeight;
            this.overlay.height = targetHeight;
            let ctx = this.background.getContext('2d');
            if (ctx) {
                ctx.drawImage(
                    this.image,
                        0,
                        0,
                        this.image.width,
                        this.image.height, // source rectangle
                        0,
                        0,
                        this.background.width,
                        targetHeight,
                    );
                this.drawBoxes();
            }
        };
        this.image.src = image;
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.frameData !== this.props.frameData) {
            this.onFrameChange();
        }

        if (prevProps.annotations !== this.props.annotations ||
            prevProps.colorBy !== this.props.colorBy) {
            this.drawBoxes();
        }
    }

    public componentDidMount(): void {
        const wrapper = window.document.getElementById(this.name);
        wrapper.appendChild(this.html());
        this.onFrameChange();
    }

    public html() {
        return this.canvas;
    }

    public render() {
        return (
            <div id={this.name} />
        );
    }
}

export default connect(mapStateToProps)(LeftCameraImages);
