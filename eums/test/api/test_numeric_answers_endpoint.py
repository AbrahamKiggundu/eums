from eums.test.api.authenticated_api_test_case import AuthenticatedAPITestCase

from eums.test.config import BACKEND_URL
from eums.test.factories.answer_factory import NumericAnswerFactory
from eums.test.factories.question_factory import NumericQuestionFactory
from eums.test.factories.node_line_item_run_factory import NodeLineItemRunFactory


ENDPOINT_URL = BACKEND_URL + 'numeric-answers/'


class NumericAnswerEndpointTest(AuthenticatedAPITestCase):
    def test_should_get_Numeric_answers(self):
        numeric_question = NumericQuestionFactory(label='amountReceived')
        numeric_answer = NumericAnswerFactory(value=1, question=numeric_question)
        numeric_answer_details = {
            "id": numeric_answer.id,
            "value": numeric_answer.value,
            "question": numeric_answer.question_id,
            "line_item_run": numeric_answer.line_item_run_id
        }
        response = self.client.get(ENDPOINT_URL)

        self.assertEqual(response.status_code, 200)
        self.assertDictContainsSubset(numeric_answer_details, response.data[0])

    def test_should_create_numeric_answers(self):
        numeric_question = NumericQuestionFactory(label='dateOfReceipt')
        line_item_run = NodeLineItemRunFactory()
        numeric_answer_details = {
            "value": 1,
            "question": numeric_question.id,
            "line_item_run": line_item_run.id
        }
        response = self.client.post(ENDPOINT_URL, numeric_answer_details, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertDictContainsSubset(numeric_answer_details, response.data)

    def test_should_update_numeric_answers(self):
        numeric_question = NumericQuestionFactory(label='amountReceived')
        numeric_answer = NumericAnswerFactory(value=1, question=numeric_question)
        updated_numeric_answer_details = {
            "value": 2
        }
        response = self.client.patch(ENDPOINT_URL+str(numeric_answer.id)+"/", updated_numeric_answer_details, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertDictContainsSubset(updated_numeric_answer_details, response.data)