# Attendance Screen - API Integration Guide

## Current Status
The attendance screen has been redesigned with a modern, comprehensive interface showing:
- ✅ Attendance History (Connected to real API)
- ⚠️ Leaves (Using sample data)
- ⚠️ Payments (Using sample data)
- ⚠️ Employee Details (Using sample data)

## API Endpoints Available

### Attendance (Already Connected)
- `GET /attendance/work-logs/{employee_id}` - Fetch work logs ✅
- `POST /attendance/clock-in` - Clock in ✅
- `POST /attendance/clock-out` - Clock out ✅
- `GET /attendance/monthly-report/{employee_id}` - Monthly report ✅

### Leaves (API Available, Need to Connect)
- `GET /employees/leave/{employee_id}` - Get employee leaves
- `POST /employees/leave` - Apply for leave
- `GET /employees/pending-leaves` - Get pending leaves
- `PUT /employees/leave/{leave_id}/status/{status}` - Update leave status

### Employee Details (API Available, Need to Connect)
- `GET /employees/{employee_id}` - Get employee details
- `GET /employees` - List all employees

### Payments/Salary (NOT AVAILABLE IN BACKEND)
The backend currently does NOT have endpoints for:
- Employee salary history
- Payment details
- Deductions
- Allowances

## What Needs to Be Done

### 1. Connect Leaves Tab to Real Data

Create a `LeaveProvider` similar to `AttendanceProvider`:

```dart
// lib/presentation/providers/leave_provider.dart
class LeaveProvider extends ChangeNotifier {
  final ApiService _apiService;
  List<dynamic> _leaves = [];
  bool _isLoading = false;
  String? _error;

  List<dynamic> get leaves => _leaves;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchLeaves(int employeeId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      final response = await _apiService.getEmployeeLeaves(employeeId);
      if (response.statusCode == 200) {
        _leaves = response.data as List;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> applyLeave(Map<String, dynamic> leaveData) async {
    try {
      final response = await _apiService.applyLeave(leaveData);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
```

Then update `_LeavesTab` to use this provider instead of hardcoded data.

### 2. Connect Employee Details Tab

Update `_DetailsTab` to fetch real employee data:

```dart
Future<void> _fetchEmployeeDetails() async {
  final apiService = ApiService();
  final response = await apiService.getEmployeeDetails(employeeId);
  if (response.statusCode == 200) {
    final employee = response.data;
    // Update UI with real data
  }
}
```

### 3. Add Payment/Salary Endpoints to Backend

The backend needs new endpoints for salary management:

```python
# app/api/employee.py

@router.get("/salary-history/{employee_id}")
def get_salary_history(employee_id: int, db: Session = Depends(get_db)):
    # Return list of salary payments with:
    # - month, year
    # - basic_salary
    # - allowances (breakdown)
    # - deductions (breakdown)
    # - net_salary
    # - paid_on date
    pass

@router.get("/salary-slip/{employee_id}/{month}/{year}")
def get_salary_slip(employee_id: int, month: int, year: int, db: Session = Depends(get_db)):
    # Return detailed salary slip for a specific month
    pass
```

You'll need to create a `Salary` or `Payroll` model in the database to store this information.

### 4. Create Models

Create Dart models for structured data:

```dart
// lib/data/models/leave_model.dart
class Leave {
  final int id;
  final int employeeId;
  final String type;
  final DateTime fromDate;
  final DateTime toDate;
  final String reason;
  final String status;

  Leave.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        employeeId = json['employee_id'],
        type = json['type'],
        fromDate = DateTime.parse(json['from_date']),
        toDate = DateTime.parse(json['to_date']),
        reason = json['reason'],
        status = json['status'];
}

// lib/data/models/salary_model.dart
class SalaryPayment {
  final int id;
  final String month;
  final double basicSalary;
  final double allowances;
  final double deductions;
  final double netSalary;
  final DateTime paidOn;

  SalaryPayment.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        month = json['month'],
        basicSalary = json['basic_salary'].toDouble(),
        allowances = json['allowances'].toDouble(),
        deductions = json['deductions'].toDouble(),
        netSalary = json['net_salary'].toDouble(),
        paidOn = DateTime.parse(json['paid_on']);
}
```

## Quick Win: Connect Leaves Now

The easiest next step is to connect the Leaves tab since the API already exists:

1. Create `LeaveProvider`
2. Add it to `main.dart` providers list
3. Update `_LeavesTab` to use `context.watch<LeaveProvider>()`
4. Replace hardcoded `_LeaveCard` widgets with data from provider

## Summary

**Currently Working:**
- ✅ Attendance history with real data
- ✅ Clock in/out functionality
- ✅ Monthly attendance summary

**Ready to Connect (API exists):**
- 🟡 Leave history
- 🟡 Leave application
- 🟡 Employee details

**Needs Backend Development:**
- 🔴 Salary/payment history
- 🔴 Payment deductions
- 🔴 Allowances breakdown

The UI is complete and looks great! Now it's just a matter of connecting the data sources.
