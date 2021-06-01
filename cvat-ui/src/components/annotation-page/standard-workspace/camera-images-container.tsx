import React from 'react';
import Layout from 'antd/lib/layout';
import { Row } from 'antd';
import LeftCameraImages from 'components/annotation-page/standard-workspace/camera-images';


class LeftCameraImagesContainer extends React.PureComponent {

    public render() {
        return (
            <Layout.Sider className='cvat-camera-images-sidebar' theme='light' width={300}>
                <Row>
                    Front
                </Row>
                <Row>
                    <LeftCameraImages camera='camera_f' />
                </Row>
                <Row>
                    Front left
                </Row>
                <Row>
                    <LeftCameraImages camera='camera_fl' />
                </Row>
                <Row>
                    Front right
                </Row>
                <Row>
                    <LeftCameraImages camera='camera_fr' />
                </Row>
            </Layout.Sider>
        );
    }
}

export default LeftCameraImagesContainer;
