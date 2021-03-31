import React from 'react';
import Layout from 'antd/lib/layout';
import { Row, Col, Divider } from 'antd';
// import SVG from 'svg.js';
import SVG from 'svg.js';
import 'cvat-canvas/src/typescript/svg.patch';
import './canvas-container.css';
// import Snap from 'snapsvg';

class LeftCameraImages extends React.PureComponent {
    canvas: HTMLDivElement;
    background: HTMLCanvasElement;
    overlay: HTMLCanvasElement;
    image: HTMLImageElement;
    content: SVGSVGElement;
    adoptedContent: SVG.Container;

    constructor(props: any) {
        super(props);
        this.canvas = window.document.createElement('div');
        this.background = window.document.createElement('canvas');
        this.canvas.appendChild(this.background);
        this.content = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.overlay = window.document.createElement('canvas');
        this.canvas.appendChild(this.overlay);

        // this.content.setAttribute("width", String(this.background.width))
        // this.content.setAttribute("height", String(this.background.height))
        // this.content.setAttribute("position", "absolute")
        // this.content.setAttribute("top", '0px')
        // this.content.setAttribute("left", '0px');

        // this.adoptedContent = SVG.adopt((this.content as any) as HTMLElement) as SVG.Container;
        // this.canvas.appendChild(this.content);

        // this.adoptedContent.rect().size(100,100).move(0,0);

        this.background.width = 300;
        this.background.height = 300;
        this.overlay.width = 300;
        this.overlay.height = 300;

        let ctx = this.background.getContext('2d');
        let image = new Image();
        image.onload = () => {
            // Make sure the image is loaded first otherwise nothing will draw.
            var ratio = image.height / image.width;
            console.log('ratio', ratio, this.background.width, this.background.width);
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                image.height, // source rectangle
                0,
                0,
                this.background.width,
                ratio * this.background.width,
            );
        };
        image.src = 'https://assets.pixolum.com/blog/wp-content/uploads/2019/09/Blumen-Fotografieren-50mm-800x533.jpg';
    }

    public componentDidMount(): void {
        // see https://eloquentjavascript.net/17_canvas.html
        let cx = this.overlay.getContext('2d');
        cx.strokeStyle = 'red';
        cx.strokeRect(100, 100, 100, 100);

        const [wrapper] = window.document.getElementsByClassName('cvat-side-image-container');
        wrapper.appendChild(this.html());

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

export default LeftCameraImages;
