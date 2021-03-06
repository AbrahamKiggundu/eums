from eums.models import Item, ItemUnit
from eums.test.api.api_test_helpers import create_distribution_plan_node, create_distribution_plan_line_item, \
    create_sales_order, create_sales_order_item
from eums.test.api.authenticated_api_test_case import AuthenticatedAPITestCase
from eums.test.config import BACKEND_URL


ENDPOINT_URL = BACKEND_URL + 'distribution-plan-line-item/'


class DistributionPlanLineItemTest(AuthenticatedAPITestCase):
    def test_should_create_distribution_plan_line_item(self):
        item_unit = ItemUnit.objects.create(name='EA')
        item = Item.objects.create(description='Item 1', unit=item_unit)
        sales_order = create_sales_order(self)

        sales_order_details = {'sales_order': sales_order['id'], 'item': item.id, 'quantity': 23,
                               'net_price': 12000.0, 'net_value': 100.0, 'issue_date': '2014-01-21',
                               'delivery_date': '2014-01-21', 'item_number': 10}

        sales_item_id = create_sales_order_item(self, sales_order_details)['id']

        node = create_distribution_plan_node(self)

        item_details = {'item': sales_item_id, 'targeted_quantity': 10, 'planned_distribution_date': '2014-01-21',
                        'remark': "Dispatched", 'distribution_plan_node': node['id'], 'track': False}

        returned_item = create_distribution_plan_line_item(self, item_details)

        self.assertDictContainsSubset(item_details, returned_item)