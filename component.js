'use strict';

var CalendarComponent = (function () {
    return {
        data: function () {
            return {
                window: window,
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
            }
        },
        props: ['manager', 'tournament', 'group'],
        mounted: function () {
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
                    console.log(this.tournament || this.tournaments[0].id)
                    this.selectTournament(this.tournament || this.tournaments[0].id);
                }.bind(this));
        },
        methods: {
            selectTournament: function (id) {
                this.selected.tournament = this.tournaments.find(function (tournament) {
                    return tournament.id === id;
                });
                this.selectGroup(this.group || this.selected.tournament.groups[0].id);
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
                        var selectedTournamentId = this.selected.tournament.id;
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
                                        link: {
                                            self: 'https://leverade.com/tournament/' + selectedTournamentId + '/match/' + match.id + '/results'
                                        },
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
                                        }).sort(function (a, b) {
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
        },
        template: `
    <div class="col-sm-12" v-if="selected.group.rounds?selected.group.rounds.length>0:true">
    <div class="box-info full">
        <div class="manager-index-section-header h4 padd-all">
            <img class="img-square-24 img-circle background-color" src="https://static.leverade.com/img/domains/icon-calendar.svg">
            <span class="text-color">Calendar</span>
        </div>
        <div class="row half-padd-top marginless half-padd-bottom half-padd-left top-bordered">
            <div class="col-sm-6 horizontal-paddingless half-padd-right">
                <div class="btn-group bootstrap-select dropdown form-control">
                    <button type="button" class="dropdown-toggle form-control" data-toggle="dropdown">
                        <span class="filter-option pull-left">{{selected.tournament.name}}</span>&nbsp;
                        <span v-if="tournament===undefined && tournaments.length > 1 " class="caret"></span>
                    </button>
                    <ul v-if="tournament===undefined && tournaments.length > 1 " class="dropdown-menu inner" role="menu">
                        <li v-for="tournament in tournaments" v-on:click="selectTournament(tournament.id)">
                            <a tabindex="0" class="" data-tokens="null">
                                <span class="text">{{tournament.name}}</span>
                                <span class="fa fa-check check-mark"></span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="col-sm-6 horizontal-paddingless half-padd-right">
                <div class="btn-group bootstrap-select dropdown form-control">
                    <button type="button" class="dropdown-toggle form-control" data-toggle="dropdown">
                        <span class="filter-option pull-left">{{selected.group.name}}</span>&nbsp;
                        <span v-if="group ===undefined && selected.tournament.groups.length > 1 " class="caret"></span>
                    </button>
                    <ul v-if=" group===undefined && selected.tournament.groups.length > 1 " class="dropdown-menu inner" role="menu">
                        <li v-for="group in selected.tournament.groups" v-on:click="selectGroup(group.id)">
                            <a >
                                <span class="text">{{group.name}}</span>
                                <span class="fa fa-check check-mark"></span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div id="custom-domain-calendar-widget">
            <div class="ml-table initialized">
                <div class="ml-bottom">
                    <div class="ml-secondary-inputs">
                        <div class="ml-tertiary-inputs">
                            <input name="actual" value="1" type="hidden"> </div>
                        <div class="table-responsive">
                            <table class="table tablestyle-e1d9 tabletype-public">
                                <thead>
                                    <tr>
                                        <th class="colstyle-equipo-1 ml-trigger">
                                            <span>Team 1</span>
                                            <input name="column" value="equipo_1.asc" type="hidden">
                                        </th>
                                        <th class="colstyle-resultado ml-trigger" ml-controller="https://ligaesplol.com/en/ajax/table-sort-column" ml-source=".ml-table .ml-secondary-inputs"
                                            ml-destination=".ml-table .ml-bottom" ml-position="replace">
                                            <span>Result</span>
                                            <input name="column" value="resultado.asc" type="hidden">
                                        </th>
                                        <th class="colstyle-equipo-2 ml-trigger" ml-controller="https://ligaesplol.com/en/ajax/table-sort-column" ml-source=".ml-table .ml-secondary-inputs"
                                            ml-destination=".ml-table .ml-bottom" ml-position="replace">
                                            <span>Team 2</span>
                                            <input name="column" value="equipo_2.asc" type="hidden">
                                        </th>
                                    </tr>
                                </thead>
                                <tbody data-link="row" class="rowlink">

                                    <tr v-for="match in selected.round.matches" v-on:click="window.location.href=match.link.self">
                                                                   

                                        <td class="colstyle-equipo-1">
                                        
                                            <img v-bind:src="match.teams[0].avatar" class="img-circle ">
                                            <span class="ellipsis">{{match.teams[0].name}}</span>
                                        </td>
                                        <td class="colstyle-resultado">
                                            <span v-if="match.status==='finished'" class="result">{{match.teams[0].score}}&nbsp;–&nbsp;{{match.teams[1].score}}</span>
                                            <span v-else class="result">{{match.date}}</span>
                                        </td>
                                        <td class="colstyle-equipo-2">
                                            <span class="ellipsis">{{match.teams[1].name}}</span>
                                            <img v-bind:src="match.teams[1].avatar" class="img-circle "> </td>

                                    </tr>

                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="padd half-padd-top half-padd-bottom relative text-center">
                <a class="show-more absolute-right half-marg-top half-marg-bottom marg-right" href="https://ligaesplol.com/en/tournament/556320/calendar/1427937/7957574">
                    Show calendar
                    <!--
            -->
                    <span class="half-padd-left">
                        <i class="fa fa-arrow-right"></i>
                    </span>
                </a>
                <a v-if="!isFirstRound(selected.round)" class="btn-light paddingless btn btn-default ml-trigger" ml-controller="https://ligaesplol.com/en/ajax/widgets/manager/136663/round-matches-calendar"
                    ml-destination=".box-info" ml-position="replace">
                    <i v-on:click="selectPreviousRound(selected.round)" class="fa fa-fw fa-angle-left"></i>
                    <span class="sr-only">Back</span>
                </a> {{selected.round.name}}
                <a v-if="!isLastRound(selected.round)" class="btn-light paddingless btn btn-default ml-trigger" ml-controller="https://ligaesplol.com/en/ajax/widgets/manager/136663/round-matches-calendar"
                    ml-destination=".box-info" ml-position="replace">
                    <i v-on:click="selectNextRound(selected.round)" class="fa fa-fw fa-angle-right"></i>
                    <span class="sr-only">Next</span>
                </a>
            </div>
        </div>
    </div>
</div>
    `
    }
})();