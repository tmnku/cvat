import React from 'react';
import 'cvat-canvas/src/typescript/svg.patch';
import { Image as CanvasImage } from 'cvat-canvas/src/typescript/canvasModel';
import { CombinedState, ObjectType } from 'reducers/interfaces';
import { connect } from 'react-redux';
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
    image: CanvasImage | null;
    depth: Image | null;
    name: string;
    depthCanvas: HTMLCanvasElement;
    depthCtx: any;
    calib: any;

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
        this.calib = null;

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
                let depth = this.getDepthAt(an.points[0], an.points[1]);
                // TODO compute world point
                // TODO project from world to this camera image

                // TODO get width and height of side images from somewhere
                let x = an.points[0] / this.props.frameData.width * 300;
                let y = an.points[1] / this.props.frameData.height * 160;
                let w = 5;
                let h = 5;
                ctx.strokeRect(x, y, w, h);
            }
        }
    }

    // TODO only do this once outside this class
    public onFrameChange() {
        this.props.frameData.getCalibFile()
            .then((data: any) => {
                console.log(`this is the calib file`, data.depth);
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
            let image = new Image()
            image.onload = () => {
                let ratio = image.height / image.width;
                let targetHeight = ratio * this.background.width;
                this.background.height = targetHeight;
                this.overlay.height = targetHeight;
                let ctx = this.background.getContext('2d');
                if (ctx) {
                    ctx.drawImage(
                            image,
                            0,
                            0,
                            image.width,
                            image.height, // source rectangle
                            0,
                            0,
                            this.background.width,
                            targetHeight,
                        );
                    this.drawBoxes();
                }
            };
            image.src = data;
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
