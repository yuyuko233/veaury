import React from 'react';
import getChildInfo from "./getChildInfo";
import isTextChild, {isTextOwner} from "./isTextChild";
import takeVueDomInReact from "./takeVueDomInReact";
import FakeDirective from "./FakeDirective";
import { pureInterceptProps } from "./interceptProps";

interface getDistinguishReactOrVueParams {
    reactComponents?: object | Function | (object | Function)[] | 'all' | JSX.IntrinsicElements;
    domTags?: any;
    division?: boolean;
}

export default function getDistinguishReactOrVue({reactComponents: Component, domTags, division = true}: getDistinguishReactOrVueParams) {
    return function defaultSlotsFormatter(children: any, vueInReactCall?, hashList?) {
        if (children && children.forEach) {
            const newChildren: any = []
            children.forEach((child, topIndex) => {
                if (!child) return
                if (!child.componentOptions?.Ctor?.options?.originReactComponent) {
                    // reactNode
                    if (child.$$typeof || typeof child === 'string') {
                        newChildren.push(child)
                        return
                    }
                    if (isTextOwner(child)) {
                        child.text.trim() !== '' && newChildren.push(child.text.trim())
                    } else if(child.tag) {
                        // newChildren.push(vueInReactCall([child], null, true))
                        let newChild = takeVueDomInReact(child, domTags, vueInReactCall, division, defaultSlotsFormatter, hashList, children.__top__)
                        if (newChild instanceof Array) {
                            newChild = newChild[0]
                        }
                        if (newChild.key == null && children.length > 1) {
                            newChild = {...newChild}
                            newChild.key = `_key_${topIndex}`
                        }
                        if (hashList) {
                            newChild = {...newChild}
                            newChild.props = {...newChild.props}
                            hashList.forEach((val) => {
                                newChild.props[val] = ''
                            })
                        }
                        newChildren.push(newChild)
                    }
                    return
                }
                const ReactComponent = child.componentOptions.Ctor.options.originReactComponent

                let newChild
                if (Component !== 'all' && ! (Component instanceof Array)) {
                    Component = [Component]
                }
                if (Component === 'all' || (Component as any[]).indexOf(ReactComponent) > -1) {
                    child.__top__ = children.__top__
                    const props: any = getChildInfo(child, `_key_${topIndex}`, vueInReactCall, defaultSlotsFormatter, hashList)
                    // 处理ref
                    let ref = child.data?.ref
                    if (ref && typeof ref === 'string') {
                        const refKey = ref
                        ref = (reactRef) => {
                            if (!reactRef) return
                            reactRef.__syncUpdateProps = function (newExtraData = {}) {
                                if (!children.__top__) return
                                child.__extraData = newExtraData
                                children.__top__.__syncUpdateProps({})
                            }

                            const $refs = child.context.$refs
                            if ($refs) {
                                $refs[refKey] = reactRef
                            }
                            try { Proxy } catch(e) {
                                Promise.resolve().then(() => {
                                    Object.keys(ref).forEach((key) => {
                                        if (!reactRef[key]) {
                                            reactRef[key] = ref[key]
                                        }
                                    })
                                })
                            }
                        }
                        try {
                            Proxy;
                            const oldRef= ref
                            ref = new Proxy(oldRef, {
                                get(target, key) {
                                    return target[key]
                                },
                                set(target, key, value):any {
                                    const reactRef = child.context.$refs?.[refKey]
                                    if (reactRef) {
                                        reactRef[key] = value
                                    }
                                    return value
                                }
                            })
                        } catch(e) {}
                    }
                    const directives = child.data?.directives
                    if (child.componentOptions.children) {
                        child.componentOptions.children.__top__ = children.__top__
                    }
                    if (directives && directives.length > 0) {
                        // newChild = <FakeDirective vnode={child}><ReactComponent children={defaultSlotsFormatter(child.componentOptions.children, vueInReactCall, hashList)} {...{...pureInterceptProps(props, child, ReactComponent), ...(child.__extraData ? child.__extraData : {}), ...(ref? {ref}: {})}} /></FakeDirective>
                        newChild = <FakeDirective vnode={child} reactComponent={ReactComponent} children={defaultSlotsFormatter(child.componentOptions.children, vueInReactCall, hashList)} {...{...pureInterceptProps(props, child, ReactComponent), ...(child.__extraData ? child.__extraData : {}), ...(ref? {ref}: {})}}/>
                    } else {
                        newChild = <ReactComponent children={defaultSlotsFormatter(child.componentOptions.children, vueInReactCall, hashList)} {...{...pureInterceptProps(props, child, ReactComponent), ...(child.__extraData ? child.__extraData : {}), ...(ref? {ref}: {})}} />
                    }
                } else {
                    newChild = isTextOwner(child)? child.text: takeVueDomInReact(child, domTags, vueInReactCall, division, defaultSlotsFormatter, hashList)
                }
                if (newChild instanceof Array) {
                    newChild = newChild[0]
                }
                if (newChild.key == null && children.length > 1) {
                    newChild = {...newChild}
                    newChild.key = `_key_${topIndex}`
                }
                if (hashList) {
                    newChild = {...newChild}
                    newChild.props = {...newChild.props}
                    hashList.forEach((val) => {
                        newChild.props[val] = ''
                    })
                }
                newChildren.push(newChild)
            })
            return newChildren.length === 1 ? newChildren[0]: newChildren
        }
        return children
    }
}
