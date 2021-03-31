// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasWrapperContainer from 'containers/annotation-page/canvas/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import PropagateConfirmContainer from 'containers/annotation-page/standard-workspace/propagate-confirm';
import CanvasContextMenuContainer from 'containers/annotation-page/canvas/canvas-context-menu';
import ObjectsListContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-list';
import ObjectSideBarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import CanvasPointContextMenuComponent from 'components/annotation-page/canvas/canvas-point-context-menu';
import IssueAggregatorComponent from 'components/annotation-page/review/issues-aggregator';
import LeftCameraImages from 'components/annotation-page/standard-workspace/camera-images';

export default function StandardWorkspaceComponent(): JSX.Element {
    return (
        <Layout hasSider className='cvat-standard-workspace'>
            <ControlsSideBarContainer />
            <LeftCameraImages />
            <Layout.Content style={{ position: 'relative' }}>
                <CanvasWrapperContainer />
                {/* <Row>
                    <Col span={4}>
                        my stuff<br/>
                        comes<br/>
                        here
                    </Col>
                    <Col span={16}>
                        <CanvasWrapperContainer />
                    </Col>
                    <Col span={4}>
                        my stuff
                    </Col>
                </Row> */}
            </Layout.Content>
            <ObjectSideBarComponent objectsList={<ObjectsListContainer />} />
            <PropagateConfirmContainer />
            <CanvasContextMenuContainer />
            <CanvasPointContextMenuComponent />
            <IssueAggregatorComponent />
        </Layout>
    );
}
