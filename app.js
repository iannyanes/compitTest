'use strict';
(function () {
    new Vue(
        {
            el: '#calendar-widget',
            data: {
                manager: 136663,
                tournaments: [],
                rounds: [],
                selected: {
                    tournament: {
                        id: 0,
                        name: "",
                        groups: []
                    },
                    group: {
                        name: "",
                        rounds: []
                    },
                    round: {
                        id: 0,
                        name: "",
                        matches: []
                    }
                }
            },
            created: function () {
                axios.get('https://api.leverade.com/tournaments?filter[manager_id]=' + this.manager + '&include=groups')
                    .then(function (response) {
                        return response.data;
                    })
                    .then(function (tournaments) {
                        this.tournaments = tournaments.data.map(function (serverTournament) {
                            return {
                                id: serverTournament.id,
                                name: serverTournament.attributes.name,
                                groups: tournaments.included.filter(function (group) {
                                    return serverTournament.relationships.groups.data.filter(function (tournamentGroup) {
                                        return tournamentGroup.id === group.id;
                                    }).length > 0;
                                }).sort(function (a, b) {
                                    return a.attributes.order > b.attributes.order;
                                })
                                    .map(function (tournamentGroup) {
                                        return {
                                            id: tournamentGroup.id,
                                            name: tournamentGroup.attributes.name
                                        };
                                    })
                            };
                        });
                        this.selectTournament(this.tournaments[0].id);
                    }.bind(this));
            },
            methods: {
                selectTournament: function (id) {
                    this.selected.tournament = this.tournaments.find(function (tournament) {
                        return tournament.id === id;
                    });
                    this.selectGroup(this.selected.tournament.groups[0].id);
                },
                selectGroup: function (id) {
                    this.selected.group = this.selected.tournament.groups.find(function (group) {
                        return id === group.id;
                    });
                    axios.get('https://api.leverade.com/rounds?filter[group_id]=' + id + '&include=matches.results,matches.teams,matches.facility')
                        .then(function (response) {
                            return response.data;
                        })
                        .then(function (rounds) {
                            this.selected.group.rounds = rounds.data.map(function (round) {
                                return {
                                    id: round.id,
                                    name: round.attributes.name,
                                    matches: rounds.included.filter(function (included) {
                                        return included.type === "match";
                                    }).filter(function (match) {
                                        return round.relationships.matches.data.filter(function (roundMatch) {
                                            return match.id === roundMatch.id;
                                        }).length > 0;
                                    }).map(function (match) {
                                        return {
                                            id: match.id,
                                            status: match.attributes.finished ? 'finished' : match.attributes.postponed ? 'postponed' : match.attributes.rest ? 'rest' : undefined,
                                            date: match.attributes.date,
                                            teams: rounds.included.filter(function (included) {
                                                return included.type === "team";
                                            }).filter(function (team) {
                                                return match.relationships.teams.data.filter(function (matchTeam) {
                                                    return team.id === matchTeam.id;
                                                }).length > 0;
                                            }).map(function (team) {
                                                return {
                                                    id: team.id,
                                                    name: team.attributes.name,
                                                    home: team.id === match.meta.home_team,
                                                    avatar: team.meta.avatar.large.replace('500', '30').replace('500', '30'),
                                                    score: rounds.included.filter(function (included) {
                                                        return included.type === "result";
                                                    }).filter(function (result) {
                                                        return result.relationships.team.data.id === team.id && result.relationships.parent.data.id === match.id;
                                                    })[0].attributes.score
                                                };
                                            }).sort(function(a,b){
                                                return !a.home
                                            })
                                        };
                                    })
                                };
                            });
                            this.selectRound(this.selected.group.rounds.filter(function (round) {
                                return round.matches.filter(function (match) {
                                    return match.status === "rest" || undefined
                                }).length > 0 || true;
                            })[0]
                            );
                        }.bind(this));
                },
                selectRound: function (round) {
                    this.selected.round = round ? round : this.selected.round;
                },
                isLastRound: function (round) {
                    return this.selected.group.rounds ? this.selected.group.rounds.indexOf(round) === this.selected.group.rounds.length - 1 : false;
                },
                isFirstRound: function (round) {
                    return this.selected.group.rounds ? this.selected.group.rounds.indexOf(round) === 0 : false;
                },
                selectNextRound: function (round) {
                    this.selectRound(this.selected.group.rounds[this.selected.group.rounds.indexOf(round) + 1] ? this.selected.group.rounds[this.selected.group.rounds.indexOf(round) + 1] : this.selected.round);
                },
                selectPreviousRound: function (round) {
                    this.selectRound(this.selected.group.rounds[this.selected.group.rounds.indexOf(round) - 1] ? this.selected.group.rounds[this.selected.group.rounds.indexOf(round) - 1] : this.selected.round);
                }
            }

        }
    );
})();
