import React from 'react';
import Layout from 'antd/lib/layout';
import { Row, Col, Divider } from 'antd';
// import SVG from 'svg.js';
import SVG from 'svg.js';
import 'cvat-canvas/src/typescript/svg.patch';
import { Image as CanvasImage } from 'cvat-canvas/src/typescript/canvasModel';
import './canvas-container.css';
// import Snap from 'snapsvg';
import { CombinedState, ObjectType } from 'reducers/interfaces';
import { connect } from 'react-redux';
// import { ObjectType } from 'cvat-ui/src/reducers/interfaces';

interface Props {
    activeLabelID: number;
    frameData: any;
    annotations: any[];
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

    constructor(props: Props) {
        super(props);
        this.canvas = window.document.createElement('div');
        this.background = window.document.createElement('canvas');
        this.canvas.appendChild(this.background);
        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.overlay = window.document.createElement('canvas');
        this.canvas.appendChild(this.overlay);

        this.overlay.id = 'cvat-side-image-overlay';
        this.background.id = 'cvat-side-image-background';

        this.image = null;

        this.background.width = 300;
        this.overlay.width = 300;

        // let image = new Image();
        // image.onload = () => {
        //     // Make sure the image is loaded first otherwise nothing will draw.
        //     var ratio = image.height / image.width;
        //     let targetHeight = ratio * this.background.width;
        //     this.background.height = targetHeight;
        //     this.overlay.height = targetHeight;
        //     ctx.drawImage(
        //         image,
        //         0,
        //         0,
        //         image.width,
        //         image.height, // source rectangle
        //         0,
        //         0,
        //         this.background.width,
        //         targetHeight,
        //     );
        // };
        // image.src = 'https://assets.pixolum.com/blog/wp-content/uploads/2019/09/Blumen-Fotografieren-50mm-800x533.jpg';
    }

    // reload image and draw rectangles on top
    public update() {
        let annotations = this.props.annotations.filter((e) => e.objectType !== ObjectType.TAG);
        for (let an of annotations) {
            console.log(an);
        }

        this.props.frameData
            .data((): void => {
                this.image = null;
            })
            .then((data: CanvasImage): void => {
                console.log('got image', this.props.annotations);
                let image = data.imageData;
                let ctx = this.background.getContext('2d');
                let ratio = image.height / image.width;
                let targetHeight = ratio * this.background.width;
                this.background.height = targetHeight;
                this.overlay.height = targetHeight;
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
        const [wrapper] = window.document.getElementsByClassName('cvat-side-image-container');
        wrapper.appendChild(this.html());
        this.update();

        // ,

        // var draw = SVG('mydiv').size(300, 130)
        // var rect = draw.rect(100, 100).fill('#f06').move(20, 20)

        // let snap = Snap("#mydiv");

        // let bigCircle = snap.circle(50, 50, 25);

        // let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        // let cont = window.getElement
    }

    public html() {
        return this.canvas;
    }

    public render() {
        // return <h1>This is my component</h1>
        return (
            <Layout.Sider className='cvat-camera-images-sidebar' theme='light' width={300}>
                <div className='cvat-side-image-container' id='mydiv' />
                {/* <Row>

            </Row>
            <Row>
            My sider
            </Row>
            <Row>
            My sider
            </Row> */}
            </Layout.Sider>
        );
    }
}

export default connect(mapStateToProps)(LeftCameraImages);
