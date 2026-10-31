# 🔐 User Assignment & Access Control

## **IMPORTANT: User-Specific Data Filtering**

### **Requirement**
✅ **Each employee should ONLY see data assigned to them**

- Housekeeping staff should only see **their assigned rooms**
- Housekeeping staff should only see **service requests assigned to them**
- Kitchen staff should only see **orders for their station**
- Waiters should only see **their assigned tables/orders**

---

## **How It Works (Backend Integration)**

### **1. User Authentication**
When a user logs in:
```dart
// Login response includes user ID and role
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user_id": 123,  // ← User's unique ID
  "role": "Housekeeping"
}
```

### **2. API Requests with User Context**
All API calls will include the user's token, which the backend uses to filter data:

```dart
// Example: Fetch assigned rooms
GET /api/housekeeping/rooms/assigned
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}

// Backend extracts user_id from token
// Returns ONLY rooms where assigned_to = user_id
```

### **3. Service Request Filtering**
```dart
// Example: Fetch assigned service requests
GET /api/housekeeping/service-requests
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}

// Backend logic:
// SELECT * FROM service_requests 
// WHERE assigned_to = {user_id_from_token}
// OR status = 'Unassigned'  // Show unassigned for claiming
```

---

## **Current Implementation (Mock Data)**

### **What's Happening Now:**
- ✅ Login works with real API
- ✅ Token is stored securely
- ⚠️ **Mock data shows ALL rooms** (not filtered by user)
- ⚠️ **Mock data shows ALL requests** (not filtered by user)

### **What Will Happen After Backend Integration:**

#### **Room List Screen**
```dart
// BEFORE (Mock - shows all rooms)
List<Room> _rooms = [
  Room(id: 101, roomNumber: "101", ...),
  Room(id: 102, roomNumber: "102", ...),
  Room(id: 201, roomNumber: "201", ...),
  // Shows ALL rooms
];

// AFTER (Real API - filtered by user)
Future<List<Room>> fetchAssignedRooms() async {
  final response = await _apiService.get(
    '/housekeeping/rooms/assigned',
    // Token automatically included by Dio interceptor
  );
  // Backend returns ONLY rooms assigned to this user
  return response.data.map((json) => Room.fromJson(json)).toList();
}
```

#### **Service Requests Screen**
```dart
// BEFORE (Mock - shows all requests)
List<ServiceRequest> _allRequests = [
  ServiceRequest(id: "SR001", roomNumber: "305", ...),
  ServiceRequest(id: "SR002", roomNumber: "201", ...),
  // Shows ALL requests
];

// AFTER (Real API - filtered by user)
Future<List<ServiceRequest>> fetchMyRequests() async {
  final response = await _apiService.get(
    '/housekeeping/service-requests/assigned',
    // Token automatically included
  );
  // Backend returns ONLY requests assigned to this user
  return response.data.map((json) => ServiceRequest.fromJson(json)).toList();
}
```

---

## **Backend API Requirements**

### **Required Endpoints with User Filtering**

#### **1. Assigned Rooms**
```
GET /api/housekeeping/rooms/assigned
Authorization: Bearer {token}

Response:
[
  {
    "id": 101,
    "room_number": "101",
    "status": "Dirty",
    "assigned_to": 123,  // Current user's ID
    "assigned_to_name": "John Doe",
    "floor": 1,
    "type": "Deluxe"
  }
]
```

#### **2. Assigned Service Requests**
```
GET /api/housekeeping/service-requests/assigned
Authorization: Bearer {token}

Response:
[
  {
    "id": "SR001",
    "room_number": "305",
    "type": "Towels",
    "description": "Need 2 extra towels",
    "priority": "High",
    "status": "Pending",
    "assigned_to": 123,  // Current user's ID
    "created_at": "2026-01-16T10:30:00Z",
    "guest_name": "Sarah M"
  }
]
```

#### **3. User Profile**
```
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
  "id": 123,
  "email": "housekeeping@orchid.com",
  "name": "John Doe",
  "role": "Housekeeping",
  "assigned_rooms": [101, 102, 103],  // Room IDs
  "assigned_floor": 1,
  "shift": "Morning"
}
```

---

## **Security Considerations**

### **Backend Must Enforce:**
1. ✅ **Token Validation** - Every request must have valid token
2. ✅ **User Extraction** - Extract user_id from JWT token
3. ✅ **Data Filtering** - Only return data where `assigned_to = user_id`
4. ✅ **Authorization Checks** - Prevent users from accessing others' data

### **Example Backend Logic (Python/FastAPI)**
```python
@router.get("/housekeeping/rooms/assigned")
async def get_assigned_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # current_user is extracted from JWT token
    # Only return rooms assigned to this user
    rooms = db.query(Room).filter(
        Room.assigned_to == current_user.id
    ).all()
    
    return rooms
```

---

## **Mobile App Implementation**

### **API Service with Auto Token Injection**
```dart
class ApiService {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  ApiService() {
    _dio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
    
    // Interceptor to automatically add token to all requests
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: AppConstants.tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }

  // Fetch assigned rooms
  Future<List<Room>> getAssignedRooms() async {
    final response = await _dio.get('/housekeeping/rooms/assigned');
    return (response.data as List)
        .map((json) => Room.fromJson(json))
        .toList();
  }

  // Fetch assigned service requests
  Future<List<ServiceRequest>> getAssignedRequests() async {
    final response = await _dio.get('/housekeeping/service-requests/assigned');
    return (response.data as List)
        .map((json) => ServiceRequest.fromJson(json))
        .toList();
  }
}
```

---

## **Testing User Assignment**

### **Test Scenario 1: Different Users See Different Data**

**User A (housekeeping@orchid.com)**
- Login → Token A
- Fetch rooms → See rooms 101, 102, 103
- Fetch requests → See requests SR001, SR002

**User B (housekeeping2@orchid.com)**
- Login → Token B
- Fetch rooms → See rooms 201, 202, 203
- Fetch requests → See requests SR003, SR004

### **Test Scenario 2: Unauthorized Access**
```dart
// User A tries to access User B's room
PUT /api/housekeeping/rooms/201/status
Authorization: Bearer {token_A}

// Backend should return:
403 Forbidden - "You are not assigned to this room"
```

---

## **Migration Plan**

### **Phase 1: Current (Mock Data)**
- ✅ All features work with mock data
- ✅ UI/UX is complete
- ⚠️ Shows all data (not filtered)

### **Phase 2: Backend Integration**
1. Create backend endpoints with user filtering
2. Update API service to call real endpoints
3. Replace mock data with API calls
4. Test with multiple users

### **Phase 3: Real-Time Updates**
1. Add WebSocket for live updates
2. Push notifications for new assignments
3. Offline mode support

---

## **Summary**

### **Key Points:**
1. ✅ **User-specific data is CRITICAL** for security and UX
2. ✅ **Backend must filter by user_id** from JWT token
3. ✅ **Mobile app automatically sends token** with every request
4. ✅ **Each user sees ONLY their assigned work**

### **Current Status:**
- ✅ UI/UX complete and ready
- ✅ Token-based auth working
- ⚠️ **Waiting for backend APIs** with user filtering

### **Next Step:**
🔌 **Backend team needs to implement user-filtered endpoints**

---

**Last Updated**: January 16, 2026  
**Status**: ✅ Ready for Backend Integration
