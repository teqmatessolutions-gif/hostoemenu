# 🧪 Testing Guide - Orchid Employee App

## 🔐 **Login Credentials**

| Role | Email | Password |
|------|-------|----------|
| Housekeeping | `housekeeping@orchid.com` | `1234` |
| Kitchen | `kitchen@orchid.com` | `1234` |
| Waiter | `waiter@orchid.com` | `1234` |
| Manager | `manager@orchid.com` | `1234` |

---

## 🧹 **Housekeeping Module - Test Flow**

### **Test 1: Login & Auto-Login**
1. Open app → Should show login screen
2. Enter: `housekeeping@orchid.com` / `1234`
3. Click "LOGIN"
4. ✅ Should navigate to Housekeeping Dashboard
5. Close app and reopen
6. ✅ Should auto-login (skip login screen)

### **Test 2: Dashboard Overview**
1. After login, observe dashboard
2. ✅ Should see "Today's Progress" with Completed/Pending counts
3. ✅ Should see "URGENT - Clean Now" section with 2 rooms
4. ✅ Should see "Guest Requests" section with 1 request
5. ✅ Pull down to refresh

### **Test 3: Room Cleaning Workflow**
1. Find Room 101 in "URGENT" section
2. Click "Start Cleaning"
3. ✅ Button should change to "Mark Clean" + "Audit"
4. ✅ Completed count should NOT increase yet
5. Click "Mark Clean"
6. ✅ Completed count should increase by 1
7. ✅ Pending count should decrease by 1
8. ✅ Room should disappear from urgent list

### **Test 4: Minibar Audit**
1. Find Room 102 in urgent section
2. Click "Start Cleaning"
3. Click "Audit" button
4. ✅ Should navigate to Audit Screen
5. ✅ Should show "Audit: Room 102" title
6. ✅ Should see list of items (Water, Coke, Chips, etc.)
7. Click "+" on "Mineral Water" 3 times
8. Click "+" on "Coke Can" 2 times
9. ✅ Quantities should update
10. Click "Submit Consumption"
11. ✅ Should show success message
12. ✅ Should navigate back to dashboard

### **Test 5: Service Requests**
1. On dashboard, find "Guest Requests" section
2. See "Room 305 - Towels" request
3. Click the green checkmark icon
4. ✅ Request should be marked complete
5. ✅ Completed count should increase
6. ✅ Pending count should decrease

### **Test 6: All Service Requests**
1. Click FAB button "All Rooms" (bottom right)
2. ✅ Should navigate to room list (if implemented)
3. OR manually navigate to Service Requests screen
4. ✅ Should see stats: "Pending" and "In Progress" counts
5. ✅ Should see filter chips: All, Pending, In Progress, Completed
6. Click "Pending" filter
7. ✅ Should show only pending requests
8. Find a pending request
9. Click "Start Working"
10. ✅ Status should change to "In Progress"
11. ✅ Button should change to "Mark Complete"
12. Click "Mark Complete"
13. ✅ Status should change to "Completed"
14. ✅ Should show green checkmark

### **Test 7: Damage Report**
1. Navigate to Damage Report screen (manual navigation needed)
2. ✅ Should see "Report Damage - Room XXX" title
3. ✅ Should see blue info box
4. Select category: "Furniture"
5. Enter description: "Broken chair leg"
6. Click "Camera" button
7. ✅ Should open camera (mobile) or file picker (web)
8. Take/select a photo
9. ✅ Photo should appear in grid
10. ✅ Counter should show "1/5"
11. Click "X" on photo
12. ✅ Photo should be removed
13. Add photo again
14. Click "Submit Damage Report"
15. ✅ Should show success message
16. ✅ Should navigate back

---

## ⏰ **Attendance Module - Test Flow**

### **Test 8: Clock In/Out**
1. Navigate to Attendance screen
2. ✅ Should see current time displayed
3. ✅ Should see "Ready to Start?" message
4. ✅ Should see blue "CLOCK IN" button
5. Click "CLOCK IN"
6. ✅ Button should turn green
7. ✅ Message should change to "You're Clocked In"
8. ✅ Should show "Clocked in at HH:MM AM/PM"
9. Click "CLOCK OUT"
10. ✅ Should show success message
11. ✅ Button should turn blue again

### **Test 9: Salary Information**
1. On Attendance screen, scroll down
2. ✅ Should see "This Month" section
3. ✅ Should see stats: Present (18), Absent (2), Half Day (1)
4. ✅ Should see "Monthly Salary: ₹25,000"
5. ✅ Should see "Per Day: ₹961.54"
6. ✅ Should see "Earned: ₹17,788.46" (green)
7. ✅ Should see "Deductions: - ₹500" (red)
8. ✅ Should see "Net Salary: ₹17,288.46" (large, bold)

### **Test 10: Attendance History**
1. Scroll to "Recent Attendance" section
2. ✅ Should see last 2 days of attendance
3. ✅ Each entry should show:
   - Date (e.g., "Mon, Jan 15")
   - Clock in/out times
   - Total hours worked (e.g., "9h 0m")
4. ✅ Should have green checkmark icon

---

## 🍳 **Kitchen Module - Test Flow**

### **Test 11: KOT Display**
1. Login as Kitchen: `kitchen@orchid.com` / `1234`
2. ✅ Should navigate to Kitchen Dashboard
3. ✅ Should see KOT cards
4. Find "KOT-101" (Table 5)
5. ✅ Should show order details:
   - Table/Room number
   - Waiter name
   - Timestamp
   - Status (Pending/Cooking/Ready)
   - Item list with quantities
6. ✅ Status should be color-coded (Red=Pending, Orange=Cooking, Green=Ready)

### **Test 12: KOT Status Updates**
1. Find a "Pending" KOT
2. Click "Start Cooking"
3. ✅ Status should change to "Cooking"
4. ✅ Status badge should turn orange
5. ✅ Button should change to "Mark Ready"
6. Click "Mark Ready"
7. ✅ Status should change to "Ready"
8. ✅ Status badge should turn green
9. ✅ Should show "Waiter Notified" message

---

## 🐛 **Common Issues & Solutions**

### **Issue: Login Failed**
- ✅ **Solution**: Credentials are case-sensitive. Use exact emails above.
- ✅ **Check**: Network connection to `https://teqmates.com/orchidapi/api`

### **Issue: Auto-Login Not Working**
- ✅ **Solution**: Clear app data/cache and login again
- ✅ **Check**: Token might be expired (24 hours)

### **Issue: Photos Not Uploading**
- ✅ **Solution**: On web, image_picker has limitations. Test on mobile device.
- ✅ **Check**: Camera/storage permissions granted

### **Issue: Mock Data Not Changing**
- ✅ **Expected**: Currently using mock data. Backend integration pending.
- ✅ **Note**: Changes are local to the session only

---

## ✅ **Expected Behavior Summary**

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ✅ Working | Connected to real API |
| Auto-Login | ✅ Working | Checks token on app start |
| Housekeeping Dashboard | ✅ Working | Mock data |
| Room Status Updates | ✅ Working | Local state only |
| Minibar Audit | ✅ Working | Mock submission |
| Service Requests | ✅ Working | Mock data |
| Damage Report | ✅ Working | Mock upload |
| Attendance Clock In/Out | ✅ Working | Local state only |
| Salary Calculation | ✅ Working | Mock data |
| KOT Display | ✅ Working | Mock data |
| KOT Status Updates | ✅ Working | Local state only |

---

## 📱 **Testing Platforms**

### **Web (Chrome)**
- ✅ Login works
- ✅ All UI renders correctly
- ⚠️ Image picker limited (uses file picker instead of camera)
- ✅ Auto-login works

### **Mobile (Android/iOS)**
- ✅ Full functionality
- ✅ Camera access for damage reports
- ✅ GPS for attendance (future)
- ✅ Push notifications (future)

---

## 🎯 **Success Criteria**

### **Housekeeping Module**
- ✅ Can login as housekeeping staff
- ✅ Can see urgent rooms
- ✅ Can update room status (Dirty → Cleaning → Clean)
- ✅ Can audit minibar consumption
- ✅ Can view and complete service requests
- ✅ Can report damage with photos

### **Attendance Module**
- ✅ Can clock in/out
- ✅ Can view salary breakdown
- ✅ Can see attendance history

### **Kitchen Module**
- ✅ Can view KOT orders
- ✅ Can update order status

---

**Last Updated**: January 16, 2026
**App Version**: 1.0.0 (Development)
**Test Status**: ✅ All Core Features Functional
