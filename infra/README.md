# Infrastructure

CDK TypeScript project for Code Comprehension platform infrastructure.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Environment Variables

Required environment variables (set via CDK or Lambda environment):

- `AWS_REGION` - AWS region (e.g., `eu-west-2`)
- `COGNITO_USER_POOL_ID` - Cognito User Pool ID (automatically set by CDK)
- `COGNITO_CLIENT_ID` - Cognito Client ID (automatically set by CDK)
- `CHALLENGES_TABLE_NAME` - DynamoDB table name for challenges (automatically set by CDK)
- `USER_QUESTION_PROGRESS_TABLE_NAME` - DynamoDB table name for user question progress (automatically set by CDK)
- `CHALLENGES_BUCKET_NAME` - S3 bucket name for challenge zip files (automatically set by CDK)

See `.env.example` for reference.

## API Endpoints

All endpoints require Cognito JWT authentication via the `Authorization: Bearer <token>` header.

### GET /api/questions/:questionId

Get question details and current user's progress:

```bash
curl -X GET \
  https://your-api-id.execute-api.region.amazonaws.com/questions/q1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "questionId": "q1",
  "title": "What is the bug in the `if __name__ == \"__main__\":` block?",
  "difficulty": "easy",
  "tags": ["python", "debugging"],
  "progress": {
    "status": "NOT_STARTED",
    "updatedAt": null
  }
}
```

### PUT /api/questions/:questionId/progress

Update user's progress for a question:

```bash
curl -X PUT \
  https://your-api-id.execute-api.region.amazonaws.com/questions/q1/progress \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

Response:
```json
{
  "userId": "user-123",
  "questionId": "q1",
  "status": "IN_PROGRESS",
  "updatedAt": 1707744000000
}
```

### GET /api/progress?status=COMPLETED&limit=25

List progress items filtered by status:

```bash
curl -X GET \
  "https://your-api-id.execute-api.region.amazonaws.com/progress?status=COMPLETED&limit=25&sort=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "items": [
    {
      "userId": "user-123",
      "questionId": "q1",
      "status": "COMPLETED",
      "updatedAt": 1707744000000,
      "userStatus": "user-123#COMPLETED"
    }
  ],
  "nextCursor": "eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInF1ZXN0aW9uSWQiOiJxMiJ9"
}
```

### GET /api/progress (no status filter)

List all progress items for the user:

```bash
curl -X GET \
  "https://your-api-id.execute-api.region.amazonaws.com/progress?limit=25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Pagination

Pagination uses cursor-based tokens:

- **Cursor format**: Base64-encoded JSON string of the `LastEvaluatedKey` from DynamoDB
- **Usage**: Pass the `nextCursor` value from the previous response as the `cursor` query parameter
- **Example**: `?cursor=eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInF1ZXN0aW9uSWQiOiJxMiJ9`

The cursor is opaque to clients - decode only for debugging:
```bash
echo "eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInF1ZXN0aW9uSWQiOiJxMiJ9" | base64 -d
# Output: {"userId":"user-123","questionId":"q2"}
```

## NOT_STARTED Status Behavior

When querying with `status=NOT_STARTED`, the API returns an empty list without scanning DynamoDB. This is because "NOT_STARTED" means no progress item exists for that question. The API does not perform a scan operation.

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401) - Missing or invalid JWT token
- `INVALID_INPUT` (400) - Invalid request parameters
- `NOT_FOUND` (404) - Question not found
- `INTERNAL_ERROR` (500) - Server error
