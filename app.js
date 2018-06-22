'use strict';
(function () {
    var routes = [
        {
            path: '/calendar',
            component: CalendarComponent,
            props: function (route) {
                return {
                    manager: route.query.manager,
                    tournament: route.query.tournament,
                    group: route.query.group,

                }
            }
        },
    ];
    var router = new VueRouter({
        routes
    });
    var app = new Vue({
        router
    }).$mount('#app');
})();
