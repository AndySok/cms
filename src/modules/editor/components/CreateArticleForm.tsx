import * as React from "react";

import gql from "graphql-tag";
import { Mutation, ApolloConsumer } from 'react-apollo';

import { schema } from "../schema";
import { EditorState } from "prosemirror-state";
import { exampleSetup } from "prosemirror-example-setup";

import { editorStateToString } from '../serializeState';
import { queryAccountIDs } from '../queryHelpers';
import { MEDIUM_EXTENSION_INFO_FRAGMENT } from '../queryHelpers';

import { ArticleFormBase } from './ArticleFormBase';

import { snackbarQueue } from '../../snackbarQueue';

import { withPageLayout } from '../../core/withPageLayout';
import { Redirect } from "react-router";


const ARTICLE_MUTATION = gql`
mutation createArticle(
    $title: String!,
    $section_id: Int!,
    $content: String!,
    $summary: String,
    $created_at: String,
    $outquotes: [String!],
    $volume: Int!,
    $issue: Int!,
    $contributors: [Int!]!,
    $is_published: Boolean
    $media_ids: [Int!]) {
        createArticle(
            title: $title, 
            section_id: $section_id, 
            content: $content, 
            summary: $summary, 
            created_at: $created_at, 
            outquotes: $outquotes,
            volume: $volume,
            issue: $issue,
            contributors: $contributors,
            is_published: $is_published
            media_ids: $media_ids
        ) {            
            id
            title
            media {
                ...MediumExtensionInfo
            }
        }
    }
    ${MEDIUM_EXTENSION_INFO_FRAGMENT}
`;

interface IData {
    id: string,
    title: string
}

interface IVariables {
    title: string,
    section_id: number,
    content: string,
    summary?: string,
    created_at?: string,
    outquotes?: string[],
    volume: number,
    issue: number,
    contributors: number[],
    is_published: boolean,
    media_ids: number[]
}

class CreateArticleMutation extends Mutation<IData, IVariables> { };

const initialArticleState = {
    title: "",
    volume: "",
    issue: "",
    section: "",
    focus: "",
    date: new Date().toISOString(),
    contributors: [] as string[],
    media: [],
    editorState: EditorState.create(
        {
            schema,
            plugins: exampleSetup({ schema, menuBar: false })
        }
    )
}

export const CreateArticleUnconnected: React.FC<any> = (props) => {
    //if null, no redirect
    //otherwise redirect to the url stored
    const [redirectTo, setRedirectTo] = React.useState(null as string | null);

    if (redirectTo !== null) {
        return <Redirect to={redirectTo} />
    }

    return (
        <>
            <CreateArticleMutation
                mutation={ARTICLE_MUTATION}
                onError={(error) => {snackbarQueue.notify({
                        title: `Failed to create ${props.publish ? 'article' : 'draft'}.`, 
                        timeout: 2000
                    })
                }}
                onCompleted={(data) => {snackbarQueue.notify({
                        title: `Successfully created ${props.publish ? 'article' : 'draft'}.`, 
                        timeout: 2000
                    });
                    setRedirectTo(props.publish ? '/articles' : '/')
                }}
            >
                {(mutate) => (
                    <ApolloConsumer>
                        {(client) => (
                            <ArticleFormBase
                                initialState={initialArticleState}
                                postLabel="Post"
                                onPost={async (state) => {
                                    const userIDs = await queryAccountIDs(state.contributors, client);
                                    mutate({
                                        variables: {
                                            title: state.title,
                                            section_id: parseInt(state.section, 10),
                                            content: editorStateToString(state.editorState),
                                            summary: state.focus,
                                            created_at: new Date().toISOString(),
                                            outquotes: [],
                                            volume: parseInt(state.volume, 10),
                                            issue: parseInt(state.issue, 10),
                                            contributors: userIDs,
                                            is_published: props.publish,
                                            media_ids: state.media.map(m => parseInt(m.id))
                                        },
                                    });
                                }}
                            />
                        )
                        }
                    </ApolloConsumer>
                )}
            </CreateArticleMutation>
        </>
    )
}

export const CreateArticleForm = withPageLayout(CreateArticleUnconnected);
