import { message } from 'antd'
import { post, query, del, update, getDetail } from '../service/article'
import { EditorState } from 'draft-js';
import { draftUtils } from '../utils'
import { routerRedux } from 'dva/router'

function sleep(time){
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), time)
    })
}

export default {
    namespace: 'article',
    state: {
        articles: [],
        draft: {
            _id: null,
            title: null,
            content: null,
            editorState: EditorState.createEmpty(),
            keywords: []
        },
        preview: {
            _id: null,
            title: null,
            content: null,
            editorState: null,
            keywords: []
        }
    },
    subscriptions: {},
    effects: {
        *requireArticles({next}, {call, put, take}){
            yield put({type: 'query'})
            yield take('article/querySuccess')
            next && next()
        },
        *requirePreviewPrepared({next, payload}, {call, put}){
            try {
                var { data } = yield call(query, payload)
                if (data[0]){
                    yield put({type: 'previewPrepared', payload: data[0]})
                    typeof next === 'function' && next()
                }
            } catch (err) {
                message.error(err.message)
            }
        },
        *query({payload}, {call, put}){
            try {
                const { data } = yield call(query)
                yield put({type: 'querySuccess', payload: data})
            } catch(err) {
                console.error(err)
                message.error(err.message)
            }
        },
        *post({payload}, {call, put}){
            const { editorState, _id, title, keywords } = payload
            const actionType = _id ? 'updateArticle' : 'postArtcile'
            const successMessage = _id ? '更新成功！' : '创建成功！'
            const content = draftUtils.stateToContent(editorState)
            try {
                const { data, success } = yield call(post, {
                    _id, title, keywords, content
                })
                if(success) {
                    yield put({type: actionType, payload: data})
                    message.success(successMessage)
                    yield put({type: 'resetDraftToNull'})
                    yield put(routerRedux.push('/admin/articles'))
                }
            } catch(err) {
                message.error(err.message)
            }
        },
        *del({payload}, {call, put}){
            try {
                var { data } = yield call(del, payload)
                yield put({type: 'deleteArticle', payload})
                message.success('删除成功！')
            } catch (err) {
                message.error(err.message)
            }
        },
        *update({payload}, {call, put}){
            try {
                var { data } = yield call(update, payload)
                if (data) {
                    yield put({type: 'updateArticle', data})
                    message.success('更新成功！')
                }
            } catch (err) {
                message.error(err.message)
            }
        },
        *handleEditArticle({payload}, {put, call}){
            const { data, success } = yield call(getDetail, payload._id)
            const editorState = draftUtils.contentToState(data.content)
            const keywords = data.keywords.map(item => item._id)
            yield put({type: 'updateDraft', payload: {
                ...data, editorState, keywords
            }})
            yield put(routerRedux.push('/admin/editor'))
        },
        *handleDraftChange({payload}, {put}){
            yield put({type: 'updateDraft', payload})
        },
        *resetDraftEditorState({}, {put}){
            yield put({type: 'resetDraftToNull'})
            yield put(routerRedux.replace('/admin/editor'))
        },
        *requireArticleToPreview({payload, next}, {put, call}){
            const { data, success } = yield call(getDetail, payload._id)
            const article = data
            if (success) {
                const editorState = draftUtils.contentToState(article.content)
                yield put({type: 'previewPrepared', payload: {
                    ...article, editorState
                }})
                next && next()
            }
        },
    },
    reducers: {
        querySuccess(state, {payload}){
            return {
                ...state, articles: payload
            }
        },
        postArtcile(state, {payload}){
            let { articles } = state
            articles.push(payload)

            return {
                ...state, articles
            }
        },
        deleteArticle(state, {payload}){
            const { articles } = state
            const _articles = articles.filter(item => item._id !== payload)
            return {
                ...state, articles: _articles
            }
        },
        previewPrepared(state, {payload}){
            return {
                ...state, preview: payload
            }
        },
        resetDraftToNull (state, {payload}) {
            return {
                ...state, draft: {
                    _id: null,
                    title: null,
                    content: null,
                    editorState: EditorState.createEmpty(),
                    keywords: []
                },
            }
        },
        updateArticle(state, {payload}){
            let { articles } = state
            const index = articles.findIndex(item => item._id === payload._id)
            articles = articles.splice(index, 1, payload)
            return {
                ...state, articles
            }
        },
        updateDraft(state, {payload}){
            const { draft } = state
            return {
                ...state, draft: {
                    ...draft, ...payload
                }
            }
        }
    }
}