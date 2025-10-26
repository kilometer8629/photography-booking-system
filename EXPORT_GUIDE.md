# Booking Export Guide

## Overview

The Photography Booking System now includes a CSV export feature that allows administrators to export individual booking details to a CSV file. This guide explains how to use the export functionality and how it works.

## Features

### Single Booking Export
- Click the "Export" button next to any booking in the admin dashboard
- Download a CSV file containing all booking details
- File naming: `booking-{bookingId}.csv`

### Export Data Fields

Each exported CSV file includes the following fields:

| Field | Description | Example |
|-------|-------------|---------|
| Client Name | Full name of the client | John Doe |
| Client Email | Email address | john@example.com |
| Client Phone | Phone number | (555) 123-4567 |
| Event Date | Date of the event | 2025-10-27 |
| Start Time | Event start time | 10:00 AM |
| End Time | Event end time | 2:00 PM |
| Package | Photography package selected | Wedding |
| Status | Current booking status | confirmed |
| Location | Event location | Seattle, WA |
| Amount | Total payment amount | 2500.00 |
| Deposit Paid | Whether deposit was paid | Yes |
| Paid At | Timestamp of payment confirmation | 2025-10-27 10:15:30 |

## How to Use

### Export a Single Booking

1. **Navigate to Admin Dashboard**
   - Go to `http://localhost:3000/admin.html` (or your production URL)
   - Log in with your admin credentials

2. **Find the Booking**
   - Locate the booking you want to export in the bookings list
   - Look for the booking's client name and date

3. **Click Export**
   - Click the "Export" button (folder icon) next to the booking
   - A CSV file will automatically download

4. **Open in Spreadsheet Application**
   - Open the downloaded file in Excel, Google Sheets, or any CSV viewer
   - View and edit the booking details as needed

### File Format

The exported CSV uses standard CSV formatting:
- Fields are comma-separated
- Fields with special characters are quoted
- File encoding: UTF-8

Example CSV content:
```
Field,Value
"Client Name","John Doe"
"Client Email","john@example.com"
"Client Phone","(555) 123-4567"
"Event Date","2025-10-27"
"Start Time","10:00 AM"
"End Time","2:00 PM"
"Package","Wedding"
"Status","confirmed"
"Location","Seattle, WA"
"Amount","2500.00"
"Deposit Paid","Yes"
"Paid At","2025-10-27 10:15:30"
```

## API Details

### Export Endpoint

**URL**: `GET /api/admin/bookings/export`

**Query Parameters**:
- `id` (required): The MongoDB booking ID

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/admin/bookings/export?id=68fd8a603803d7b1781eeefc" \
  -H "Cookie: connect.sid=your_session_cookie" \
  -H "X-CSRF-Token: your_csrf_token"
```

**Success Response**:
- Status: 200 OK
- Content-Type: text/csv
- Body: CSV file content with booking details

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | No booking ID specified | Missing `id` query parameter |
| 404 | Booking not found | ID doesn't match any booking |
| 500 | Failed to export booking | Server error during export |

## Backend Implementation

### Export Endpoint Code

The export functionality is implemented in `server/index.js`:

```javascript
// Export endpoint must come BEFORE :id route to be matched first
app.get('/api/admin/bookings/export', async (req, res) => {
  try {
    const bookingId = req.query.id;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'No booking ID specified for export' });
    }
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const csv = generateBookingCSV(booking);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="booking-${bookingId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export booking error:', error);
    res.status(500).json({ error: 'Failed to export booking' });
  }
});

// Helper function to generate CSV
function generateBookingCSV(booking) {
  const headers = ['Field', 'Value'];
  const rows = [
    ['Client Name', booking.clientName],
    ['Client Email', booking.clientEmail],
    ['Client Phone', booking.clientPhone],
    ['Event Date', booking.eventDate],
    ['Start Time', booking.startTime],
    ['End Time', booking.endTime],
    ['Package', booking.package],
    ['Status', booking.status],
    ['Location', booking.location],
    ['Amount', booking.packageAmount / 100],
    ['Deposit Paid', booking.depositPaid ? 'Yes' : 'No'],
    ['Paid At', booking.stripePaidAt ? new Date(booking.stripePaidAt).toLocaleString() : 'N/A']
  ];
  
  const headerString = headers.join(',');
  const rowStrings = rows.map(row => `"${row[0]}","${row[1] || ''}"`).join('\n');
  
  return `${headerString}\n${rowStrings}`;
}
```

### Frontend Implementation

The export button is implemented in `public/js/admin.js`:

```javascript
async function exportBooking(bookingId = null) {
    try {
        setLoading(true);
        let url = `${API_BASE_URL}/bookings/export`;
        
        if (bookingId) {
            url += `?id=${bookingId}`;
        } else {
            url += `?filter=${state.bookings.filter}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = bookingId ? `booking-${bookingId}.csv` : `bookings-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        showNotification('Export successful', 'success');
    } catch (error) {
        showNotification(`Export failed: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}
```

## Troubleshooting

### Export Button Not Working

**Problem**: Clicking export does nothing

**Solutions**:
1. Check browser console for errors (F12 → Console tab)
2. Verify you're logged into the admin panel
3. Ensure the booking ID is valid
4. Check that the server is running

### CSV File Opens as Text

**Problem**: CSV file opens as plain text instead of spreadsheet

**Solution**:
- Right-click the file → Open with → Choose "Excel" or "Google Sheets"
- Or import the file into your spreadsheet application

### Export Shows "No booking ID specified"

**Problem**: Error message about missing booking ID

**Solution**:
1. Verify the booking exists in the database
2. Check the browser network tab to see the request URL
3. Ensure booking ID is valid MongoDB ObjectId format

### Special Characters Not Displaying Correctly

**Problem**: Non-ASCII characters appear corrupted

**Solution**:
- Ensure your CSV application opens files as UTF-8 encoded
- In Excel: File → Open → Select file → Click "Import" → Select "UTF-8" encoding

## Future Enhancements

Potential improvements to the export feature:

1. **Bulk Export**
   - Export multiple bookings at once
   - Filter by date range, status, or package type
   - Combine into single Excel workbook

2. **Advanced Formats**
   - PDF export with styled layout
   - Excel workbooks with multiple sheets
   - JSON export for data processing

3. **Scheduled Exports**
   - Automatic daily/weekly exports
   - Email exports to specified addresses
   - Archive historical exports

4. **Custom Fields**
   - User-configurable export fields
   - Save export templates
   - Conditional formatting options

## Best Practices

1. **Regular Backups**
   - Export important bookings regularly for backup
   - Store exports in a safe location

2. **Data Organization**
   - Use consistent naming conventions
   - Organize exports by date or client
   - Keep a master list of all exports

3. **Privacy**
   - Be careful sharing exported files (contains client info)
   - Store sensitive exports securely
   - Consider GDPR compliance when sharing data

4. **Integration**
   - Use exports for accounting software integration
   - Import into CRM systems
   - Share with clients for confirmation

## Support

For issues or questions about the export feature:

1. Check this guide for troubleshooting steps
2. Review browser console logs for errors
3. Check server logs: `npm run dev:backend`
4. Verify database connection is active
5. Ensure booking data is complete and valid

## See Also

- [PAYMENT_SETUP.md](./PAYMENT_SETUP.md) - Payment webhook configuration
- [CHANGELOG.md](./CHANGELOG.md) - Version history and updates
- [DesignStructure.md](./DesignStructure.md) - System architecture
- [README.md](./README.md) - Project overview

---

**Last Updated**: October 27, 2025  
**Export Endpoint Version**: 1.0.0  
**Status**: ✅ Production Ready
