import React from 'react';
import 'cvat-canvas/src/typescript/svg.patch';
import { Image as CanvasImage } from 'cvat-canvas/src/typescript/canvasModel';
import { CombinedState, ObjectType } from 'reducers/interfaces';
import { connect } from 'react-redux';
import { matrix, dot, transpose, multiply, inv, subset, index } from 'mathjs';
import './canvas-container.css';

interface Props {
    activeLabelID: number;
    frameData: any;
    annotations: any[];
    camera: string;
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
    } = state;
    return {
        activeLabelID,
        frameData,
        annotations,
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
    K: any;
    camera_pose: any;
    depth_pose: any;

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
        this.K = null;
        this.camera_pose = null;
        this.depth_pose = null;

        this.background.width = 300;
        this.overlay.width = 300;

        this.name = `cvat-side-image-div-${props.camera}`;
    }

    getDepthAt(x: number, y: number): number {
        let pixel = this.depthCtx.getImageData(x, y, 1, 1).data;
        let normalized = (pixel[0] + pixel[1] * 256 + pixel[2] * 256 * 256) / (256 * 256 * 256 - 1);
        let in_meters = 1000 * normalized;
        console.log(`pixel at (${x}, ${y}) is ${in_meters}`);
        return in_meters;
    }

    public drawBoxes() {
        // see https://eloquentjavascript.net/17_canvas.html
        let ctx = this.overlay.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            let annotations = this.props.annotations.filter((e) => e.objectType !== ObjectType.TAG);
            for (let an of annotations) {
                let x_i = an.points[0];
                let y_i = an.points[1];
                let depth = this.getDepthAt(x_i, y_i);

                if (this.K) {
                    let px_to_meters = 100.0/this.depth.width;
                    let x_w = -(y_i-this.depth.height/2)*px_to_meters;
                    let y_w = -(x_i-this.depth.width/2)*px_to_meters;
                    let z_w = 50-depth;
                    let p = matrix([[x_w],[y_w],[z_w],[1]]);

                    console.log(`wordl point at ${p}`);

                    let vehicle_to_cam = matrix([[0,-1,0,0], [0,0,-1,0], [1,0,0,0], [0,0,0,1]]);

                    let Rt = multiply(vehicle_to_cam, inv(this.camera_pose));
                    let C = multiply(this.K, Rt.subset(index([0, 1, 2], [0, 1, 2, 3])));
                    let uvw = multiply(C, p);

                    let w = uvw.get([2, 0]);
                    if (w < 0) {
                        continue;
                    }
                    let u = uvw.get([0, 0]) / w;
                    let v = uvw.get([1, 0]) / w;

                    console.log(`uv: ${u}, ${v}`);

                    // TODO get width and height of side images from somewhere. for now we scale down
                    let x = u / this.image.width * 300;
                    let y = v / this.image.height * 160;
                    ctx.strokeRect(x, y, 5, 5);
                }
            }
        }
    }

    // TODO only do this once outside this class
    public onFrameChange() {
        this.props.frameData.getCalibFile()
            .then((data: any) => {
                this.K = matrix(data[this.props.camera].K);
                this.camera_pose = matrix(data[this.props.camera].pose);
                this.depth_pose = matrix(data.depth.pose);

            });

        this.props.frameData.getCameraImage('depth')
        .then((data: any): void => {
            this.depth = new Image();
            this.depth.onload = () => {
                this.depthCanvas.width = this.depth.width;
                this.depthCanvas.height = this.depth.height;
                this.depthCtx.drawImage(this.depth, 0, 0);
            };
            this.depth.src = data;
        })
        .catch((exception: any): void => {
            throw exception;
        });

        this.props.frameData.getCameraImage(this.props.camera)
        .then((data: any): void => {
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
            this.image.src = data;
        })
        .catch((exception: any): void => {
            throw exception;
        });
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.frameData !== this.props.frameData) {
            this.onFrameChange();
        }

        if (prevProps.annotations !== this.props.annotations) {
            console.log('annotations changed');
            this.drawBoxes();
        }
    }

    public componentDidMount(): void {
        console.log('side images mounted');
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
