const https = require( 'https' );

const cheerio = require( 'cheerio' );
const moment = require( 'moment-timezone' );

const teamData = require( './teamdata' );

const POSTS_PATH = '/artiklar';
const RSS_ITEMS_TO_LOAD = 10;

class RSS {
    getTeamUrl ( team, path ) {
        const currentTeamData = teamData( team );

        return `https://${ currentTeamData.homepage }${ path }`;
    }

    loadPage ( team, path ) {
        return new Promise( ( resolve, reject ) => {
            const url = this.getTeamUrl( team, path );

            console.log( `loading ${ url }` );
            const request = https.get( url, ( response ) => {
                response.setEncoding( 'utf8' );
                let rawData = '';

                if ( response.statusCode !== 200 ) {
                    reject( new Error( `${ url } failed. It returned with status ${ response.statusCode }` ) );

                    return false;
                }

                response.on( 'data', ( chunk ) => {
                    rawData = `${ rawData }${ chunk }`;
                } );

                response.on( 'end', () => {
                    resolve( rawData.toString() );
                } );
            } );

            request.on( 'error', ( requestError ) => {
                reject( requestError );
            } );
        } );
    }

    fixPostContent ( team, rawPostContent ) {
        let postContent = rawPostContent;
        let $;
        const currentTeamData = teamData( team );

        // Fix external multi-protocol urls
        postContent = postContent.replace( 'src="//', 'src="https://' );
        postContent = postContent.replace( 'href="//', 'href="https://' );

        // Fix urls
        postContent = postContent.replace( 'src="/', `src="${ currentTeamData.homepage }/` );
        postContent = postContent.replace( 'href="/', `href="${ currentTeamData.homepage }/` );

        // Remove all data-* tags
        postContent = postContent.replace( /data-.+?".+?"/gim, '' );

        $ = cheerio.load( postContent );

        $( 'h1' ).remove();
        $( 'script' ).remove();
        $( '.social-buttons-article-top' ).remove();
        $( '.social-buttons-article-bottom' ).remove();

        $( '[data-srcset]' ).each( ( index, element ) => {
            const imageSizes = $( element ).attr( 'data-srcset' ).match( /([^\s]+?)\s(.+?),/g );

            for ( let i = 0; i < imageSizes.length; i = i + 1 ) {
                let [ url, size ] = imageSizes[ i ].split( ' ' );

                if ( size === '1280w,' ) {
                    $( element ).attr( 'srcset', url );

                    return true;
                }
            }
        } );

        return $.html();
    }

    getFullPost( team, path ) {
        return this.loadPage( team, path )
            .then( ( postPage ) => {
                const $ = cheerio.load( postPage );

                return this.fixPostContent( team, $( '.rmss_article-main' ).html() );
            } );
    }

    getFeed( team ) {
        const tempData = teamData( team );

        if ( !tempData.homepage ) {
            return Promise.resolve( `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
                <channel>
                    <title>${ team } News Not Implemented</title>
                    <link>https://hockey-mchockeyface.herokuapp.com/rss/${ team }</link>
                    <description>This will be a feed of the latest ${ team } news</description>
                    <language>sv-se</language>
                    <copyright>Nah, fuck that shit :D</copyright>
                </channel>
            </rss>` );
        }

        return this.getPosts( team )
            .then( ( articleObjects ) => {
                let feedString = `<?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0">
                    <channel>
                        <title>${ team } News</title>
                        <link>https://hockey-mchockeyface.herokuapp.com/rss/${ team }</link>
                        <description>This is a feed of the latest ${ team } news</description>
                        <language>sv-se</language>
                        <copyright>Nah, fuck that shit :D</copyright>`;

                for ( const article of articleObjects ) {
                    feedString = `${ feedString }
                    <item>
                        <title>${ article.title }</title>
                        <description><![CDATA[${ article.description }]]></description>
                        <link>${ article.url }</link>
                        <pubDate>${ moment( article.timestamp ).format( 'ddd, DD MMM YYYY HH:mm:ss' ) }</pubDate>
                    </item>`;
                }

                feedString = `${ feedString }
                    </channel>
                </rss>`;

                return feedString;
            } )
            .catch( ( error ) => {
                console.error( error );
            } );
    }

    getPosts ( team ) {
        return this.loadPage( team, POSTS_PATH )
            .then( ( teamPage ) => {
                const $ = cheerio.load( teamPage );
                const itemPromises = [];

                $( '.rmss--has_media' ).each( ( index, element ) => {
                    if ( index >= RSS_ITEMS_TO_LOAD ) {
                        return true;
                    }

                    itemPromises.push( new Promise( ( resolve, reject ) => {
                        const $article = $( element );
                        const title = $article.find( 'h1' ).text();
                        const timestamp = $article.find( '.rmss_c-archive-article__publish-at' ).text();
                        const url = $article.find( 'a' ).attr( 'href' );

                        this.getFullPost( team, url )
                            .then( ( fullHTML ) => {
                                resolve( {
                                    title,
                                    timestamp,
                                    url: this.getTeamUrl( team, url ),
                                    description: fullHTML,
                                } );
                            } )
                            .catch( ( someError ) => {
                                reject( someError );
                            } );
                    } ) );
                } );

                return Promise.all( itemPromises );
            } );
    }
}

module.exports = new RSS();
