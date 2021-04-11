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
    name: string;

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

        this.background.width = 300;
        this.overlay.width = 300;

        this.name = `cvat-side-image-div-${props.camera}`;

        console.log('camera name is:', this.name);
    }

    // reload image and draw rectangles on top
    public update() {
        let annotations = this.props.annotations.filter((e) => e.objectType !== ObjectType.TAG);
        for (let an of annotations) {
            console.log(an);
        }

        this.props.frameData.getCalibFile()
            .then((data: any) => {
                console.log(`this is the calib file`, data);
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
                    // see https://eloquentjavascript.net/17_canvas.html
                    let cx = this.overlay.getContext('2d');
                    cx.strokeStyle = 'red';
                    cx.lineWidth = 3;
                    cx.strokeRect(20, 20, 50, 50);
                };
                image.src = data;
            })
            .catch((exception: any): void => {
                throw exception;
            });
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.frameData !== this.props.frameData) {
            this.update();
        }
    }

    public componentDidMount(): void {
        const wrapper = window.document.getElementById(this.name);
        wrapper.appendChild(this.html());
        this.update();
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
