# Expense Sharing Application API Documentation

## Base URL
```
http://localhost:${PORT}/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## User Management APIs

### Register User
```http
POST /users/register
```
**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "phone": "1234567890"
}
```
**Response:** (201 Created)
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890"
}
```

### Login
```http
POST /users/login
```
**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```
**Response:** (200 OK)
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Get User Profile
```http
GET /users/profile
```
**Response:** (200 OK)
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "userGroups": [
    {
      "group": {
        "id": "uuid",
        "name": "Roommates"
      }
    }
  ]
}
```

### Get User Balances
```http
GET /users/balances
```
**Response:** (200 OK)
```json
[
  {
    "userId": "uuid",
    "userName": "Jane Smith",
    "amount": 150.50  // Positive means user owes you, negative means you owe them
  }
]
```

## Group Management APIs

### Create Group
```http
POST /groups
```
**Request Body:**
```json
{
  "name": "Roommates"
}
```
**Response:** (201 Created)
```json
{
  "id": "uuid",
  "name": "Roommates",
  "createdAt": "2024-02-17T10:00:00Z"
}
```

### Add Member to Group
```http
POST /groups/:groupId/members
```
**Request Body:**
```json
{
  "email": "jane@example.com"
}
```
**Response:** (200 OK)
```json
{
  "message": "Member added successfully"
}
```

## Expense APIs

### Create Expense in Group
```http
POST /groups/:groupId/expenses
```
**Request Body:**
```json
{
  "amount": 100.00,
  "description": "Dinner",
  "splitType": "EQUAL",  // EQUAL, PERCENTAGE, SHARES
  "splits": [
    {
      "userId": "uuid",
      "percentage": 50  // Only for PERCENTAGE split
      // or "shares": 2  // Only for SHARES split
    }
  ]
}
```
**Response:** (201 Created)
```json
{
  "id": "uuid",
  "amount": 100.00,
  "description": "Dinner",
  "splitType": "EQUAL",
  "splits": [/* split details */]
}
```

## Settlement APIs

### Get Group Settlements
```http
GET /settlements/group/:groupId
```
**Response:** (200 OK)
```json
[
  {
    "fromUser": "uuid",
    "toUser": "uuid",
    "amount": 50.00
  }
]
```

### Create Settlement
```http
POST /settlements
```
**Request Body:**
```json
{
  "toUserId": "uuid",
  "amount": 50.00,
  "notes": "Paying back for dinner"
}
```
**Response:** (201 Created)
```json
{
  "id": "uuid",
  "fromUserId": "uuid",
  "toUserId": "uuid",
  "amount": 50.00,
  "settledAt": "2024-02-17T10:00:00Z",
  "notes": "Paying back for dinner"
}
```

### Get User Settlements
```http
GET /settlements/user
```
**Response:** (200 OK)
```json
[
  {
    "id": "uuid",
    "fromUser": {
      "id": "uuid",
      "name": "John Doe"
    },
    "toUser": {
      "id": "uuid",
      "name": "Jane Smith"
    },
    "amount": 50.00,
    "settledAt": "2024-02-17T10:00:00Z",
    "notes": "Paying back for dinner"
  }
]
```

## Error Responses
All endpoints may return these status codes:
- 400 Bad Request - Invalid input
- 401 Unauthorized - Missing or invalid token
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server error

Error Response Format:
```json
{
  "error": "Error message",
  "details": ["Detailed error information"]
}
```



## To run the application
docker-compose up --build  
