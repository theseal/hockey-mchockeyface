const availableTeams = require( '../assets/teams.json' );

module.exports = function ( identifier ) {
    // If no identifier, get all teams
    if ( !identifier ) {
        return availableTeams;
    }

    const matchIdentifier = identifier.toLowerCase();

    for ( const teamData of availableTeams ) {
        if ( teamData.name.toLowerCase() === matchIdentifier ) {
            return teamData;
        }

        for ( const alternateName of teamData.alternateNames ) {
            if ( alternateName.toLowerCase() === matchIdentifier ) {
                return teamData;
            }
        }
    }

    console.error( `Unknown team ${ identifier }` );

    return undefined;
};
