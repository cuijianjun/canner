// @flow

import * as React from 'react';
import {Spin, Icon} from 'antd';
import type RefId from 'canner-ref-id';
import {is, List} from 'immutable';
const antIcon = <Icon type="loading" style={{fontSize: 24}} spin />;

type Props = {
  refId: RefId,
  componentId: string,
  query?: QueryDef,
  fetch: FetchDef,
  subscribe: SubscribeDef,
  ui: string
};

type State = {
  value: any,
  rootValue: any,
  isFetching: boolean,
}

export default function withQuery(Com: React.ComponentType<*>) {
  // this hoc will fetch data;
  return class ComponentWithQuery extends React.PureComponent<Props, State> {
    key: string;
    subscription: any;

    constructor(props: Props) {
      super(props);
      this.state = {
        value: null,
        rootValue: null,
        isFetching: true
      };
      this.key = props.refId.getPathArr()[0];
    }

    componentDidMount() {
      this.queryData();
    }

    componentWillReceiveProps(props: Props) {
      const {refId} = this.props;
      if (refId.toString() !== props.refId.toString()) {
        this.queryData();
      } 
    }

    componentWillUnmount() {
      this.unsubscribe();
    }

    getRootValue = () => {
      return this.state.rootValue;
    }

    queryData = () => {
      const {refId, fetch} = this.props;
      return fetch(this.key).then(data => {
        this.setState({
          rootValue: data,
          value: getValue(data, refId.getPathArr()),
          isFetching: false
        });
        this.subscribe();
      });
    }

    unsubscribe = () => {
      if (this.subscription) {
        this.subscription.unsubscribe();
      }
    }

    subscribe = () => {
      const {subscribe, refId, ui} = this.props;
      const subscription = subscribe(this.key, (newRootValue) => {
        const newValue = getValue(newRootValue, refId.getPathArr());
        const {value} = this.state
        if (shouldUpdate(value, newValue, ui)) {
          this.setState({
            rootValue: newRootValue,
            value: newValue
          });
        }
      });
      this.subscription = subscription;
    }

    render() {
      const {value, isFetching, rootValue} = this.state;
      if (isFetching) {
        return <Spin indicator={antIcon} />;
      }
      return <Com {...this.props} rootValue={rootValue} value={value} />;
    }
  };
}

function getValue(value, idPathArr) {
  if (value && idPathArr) {
    return value.getIn(idPathArr);
  }
  return null;
}

function shouldUpdate(value: any, newValue: any, ui: string) {
  if (List.isList(value)) {
    return value.size !== newValue.size;
  } else if (ui === 'fieldset') {
    return false;
  } else {
    return !is(value, newValue);
  }
}