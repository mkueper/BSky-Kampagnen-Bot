export function login(): Promise<void>;
export function postSkeet(text: any): Promise<any>;
export function getReactions(postUri: any): Promise<{
    likes: any;
    reposts: any;
}>;
export function getReplies(postUri: any): Promise<any>;
