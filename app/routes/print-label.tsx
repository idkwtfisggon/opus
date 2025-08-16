import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

export default function PrintLabelPage() {
  const [searchParams] = useSearchParams();
  const [Barcode, setBarcode] = useState<any>(null);
  const [QRCode, setQRCode] = useState<any>(null);

  const trackingNumber = searchParams.get("trackingNumber") ?? "UNKNOWN";
  const recipientName = searchParams.get("recipientName") ?? "UNKNOWN";
  const orderId = searchParams.get("orderId") ?? "UNKNOWN";
  const courier = searchParams.get("courier") ?? "UNKNOWN";
  const weight = searchParams.get("weight") ?? "0";
  const createdAt = searchParams.get("createdAt") ?? new Date().toISOString();
  const merchantName = searchParams.get("merchantName") ?? "UNKNOWN";
  const customerEmail = searchParams.get("customerEmail") ?? "";
  const shippingType = searchParams.get("shippingType") ?? "";

  useEffect(() => {
    // Dynamic import for client-side only
    import("react-barcode").then((mod) => setBarcode(() => mod.default));
    import("react-qr-code").then((mod) => setQRCode(() => mod.default));
    
    // Add print styles
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body { margin: 0; padding: 0; }
        * { print-color-adjust: exact; }
      }
    `;
    document.head.appendChild(style);
    
    // Auto-print after short delay to allow rendering
    setTimeout(() => {
      window.print();
    }, 1500);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
      style={{
        width: "4in",
        height: "3in", 
        padding: "12px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        border: "1px solid #000",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        position: "relative",
      }}
    >
      {/* Top Ruler - Inches */}
      <div style={{
        position: "absolute",
        top: "0",
        left: "0",
        width: "4in",
        height: "6px",
        backgroundColor: "white",
        borderBottom: "1px solid #000",
        display: "flex",
        zIndex: 10,
      }}>
        {[0, 1, 2, 3, 4].map(inch => (
          <div key={inch} style={{
            position: "absolute",
            left: `${inch}in`,
            width: "1px",
            height: "6px",
            backgroundColor: "#000",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}>
            <span style={{
              fontSize: "4px",
              color: "#000",
              transform: "translateY(8px)",
              fontWeight: "bold",
            }}>{inch}"</span>
          </div>
        ))}
        {/* Half-inch marks */}
        {[0.5, 1.5, 2.5, 3.5].map(inch => (
          <div key={inch} style={{
            position: "absolute",
            left: `${inch}in`,
            width: "1px",
            height: "3px",
            backgroundColor: "#000",
          }} />
        ))}
      </div>

      {/* Left Ruler - Centimeters */}
      <div style={{
        position: "absolute",
        top: "0",
        left: "0",
        width: "6px",
        height: "3in",
        backgroundColor: "white",
        borderRight: "1px solid #000",
        zIndex: 10,
      }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map(cm => (
          <div key={cm} style={{
            position: "absolute",
            top: `${cm * 0.393701}in`, // Convert cm to inches
            left: "0",
            width: "6px",
            height: "1px",
            backgroundColor: "#000",
            display: "flex",
            alignItems: "center",
          }}>
            {cm % 2 === 0 && (
              <span style={{
                fontSize: "4px",
                color: "#000",
                transform: "translateX(8px)",
                fontWeight: "bold",
              }}>{cm}</span>
            )}
          </div>
        ))}
      </div>

      {/* Right Ruler - Inches (Height) */}
      <div style={{
        position: "absolute",
        top: "0",
        right: "0",
        width: "6px",
        height: "3in",
        backgroundColor: "white",
        borderLeft: "1px solid #000",
        zIndex: 10,
      }}>
        {[0, 1, 2, 3].map(inch => (
          <div key={inch} style={{
            position: "absolute",
            top: `${inch}in`,
            right: "0",
            width: "6px",
            height: "1px",
            backgroundColor: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}>
            <span style={{
              fontSize: "4px",
              color: "#000",
              transform: "translateX(-8px)",
              fontWeight: "bold",
            }}>{inch}"</span>
          </div>
        ))}
        {/* Half-inch marks */}
        {[0.5, 1.5, 2.5].map(inch => (
          <div key={inch} style={{
            position: "absolute",
            top: `${inch}in`,
            right: "0",
            width: "3px",
            height: "1px",
            backgroundColor: "#000",
          }} />
        ))}
      </div>

      {/* Bottom Ruler - Centimeters */}
      <div style={{
        position: "absolute",
        bottom: "0",
        left: "0",
        width: "4in",
        height: "6px",
        backgroundColor: "white",
        borderTop: "1px solid #000",
        zIndex: 10,
      }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cm => (
          <div key={cm} style={{
            position: "absolute",
            left: `${cm * 0.393701}in`, // Convert cm to inches
            bottom: "0",
            width: "1px",
            height: "6px",
            backgroundColor: "#000",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}>
            {cm % 2 === 0 && (
              <span style={{
                fontSize: "4px",
                color: "#000",
                transform: "translateY(-8px)",
                fontWeight: "bold",
              }}>{cm}</span>
            )}
          </div>
        ))}
      </div>
      {/* Main Content Area - Adjusted for rulers */}
      <div style={{
        margin: "6px",
        display: "flex",
        flexDirection: "column",
        height: "calc(100% - 12px)",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "8px",
          borderBottom: "2px solid #000",
          paddingBottom: "4px"
        }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: "16px", 
            fontWeight: "bold",
            letterSpacing: "0.5px"
          }}>
            LOGISTICS HUB
          </h1>
          <div style={{ fontSize: "8px", color: "#666", marginTop: "2px" }}>
            SHIPPING LABEL
          </div>
        </div>
        <div style={{ 
          textAlign: "right",
          fontSize: "8px", 
          color: "#666",
          lineHeight: "1.2"
        }}>
          <div>{new Date(createdAt).toLocaleDateString()}</div>
          <div>{courier}</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        display: "flex", 
        flex: 1,
        gap: "8px"
      }}>
        {/* Left: Order Info */}
        <div style={{ 
          flex: "1",
          fontSize: "9px", 
          lineHeight: "1.3"
        }}>
          <div style={{ marginBottom: "3px" }}>
            <strong>TO:</strong> {recipientName}
          </div>
          <div style={{ marginBottom: "3px", fontSize: "8px", color: "#666" }}>
            {customerEmail}
          </div>
          <div style={{ marginBottom: "6px", fontSize: "8px", color: "#666" }}>
            FROM: {merchantName}
          </div>
          
          <div style={{ marginBottom: "2px" }}>
            <strong>ORDER:</strong> #{orderId.slice(-8).toUpperCase()}
          </div>
          <div style={{ marginBottom: "2px" }}>
            <strong>TRACKING:</strong> {trackingNumber}
          </div>
          <div style={{ marginBottom: "2px" }}>
            <strong>WEIGHT:</strong> {weight}kg
          </div>
          <div style={{ marginBottom: "2px" }}>
            <strong>TYPE:</strong> {shippingType === 'immediate' ? 'EXPRESS' : 'STANDARD'}
          </div>
        </div>

        {/* Right: QR Code */}
        <div style={{ 
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {QRCode ? (
            <QRCode 
              value={`${orderId}|${trackingNumber}|${courier}`} 
              size={55}
              style={{ backgroundColor: "white" }}
            />
          ) : (
            <div style={{ 
              width: "55px", 
              height: "55px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "8px", 
              color: "#666", 
              border: "1px solid #ddd" 
            }}>
              QR
            </div>
          )}
          <div style={{ fontSize: "6px", color: "#666", marginTop: "2px", textAlign: "center" }}>
            SCAN TO TRACK
          </div>
        </div>
      </div>

      {/* Bottom Barcode */}
      <div style={{ 
        borderTop: "1px solid #000",
        paddingTop: "4px",
        textAlign: "center",
        marginTop: "auto"
      }}>
        {Barcode ? (
          <Barcode 
            value={trackingNumber} 
            width={1.2} 
            height={25} 
            displayValue={true}
            fontSize={8}
            background="transparent"
            textAlign="center"
            textMargin={2}
          />
        ) : (
          <div style={{ 
            height: "30px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "8px", 
            color: "#666" 
          }}>
            {trackingNumber}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}