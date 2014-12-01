'use strict';

angular.module('PurchaseOrder', ['eums.config', 'SalesOrder'])
    .factory('PurchaseOrderService', function ($http, EumsConfig, SalesOrderService) {
        return {
            getPurchaseOrders: function () {
                var getOrdersPromise = $http.get(EumsConfig.BACKEND_URLS.PURCHASE_ORDER);
                return getOrdersPromise.then(function (response) {
                    return response.data;
                });
            },
            getPurchaseOrder: function (id) {
                return $http.get(EumsConfig.BACKEND_URLS.PURCHASE_ORDER + id).then(function (response) {
                    var order = response.data;
                    return SalesOrderService.getSalesOrder(order.sales_order).then(function (sales_order) {
                        order.sales_order = sales_order;
                        return order;
                    });
                });
            }

        };
    });