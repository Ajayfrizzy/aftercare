import AppKit
import PDFKit
import Vision
import ImageIO

func recognize(_ image: CGImage) throws -> String {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    try VNImageRequestHandler(cgImage: image).perform([request])
    return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
var text = ""
if CommandLine.arguments[2] == "application/pdf" {
    guard let pdf = PDFDocument(url: url), !pdf.isLocked, pdf.pageCount <= 12 else { exit(2) }
    for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { exit(2) }
        var part = page.string ?? ""
        if part.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let thumbnail = page.thumbnail(of: NSSize(width: 1800, height: 2400), for: .mediaBox)
            guard let image = thumbnail.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(2) }
            part = try recognize(image)
        }
        text += part + "\n"
        if text.count >= 8000 { break }
    }
} else {
    let options: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: 2400]
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { exit(2) }
    text = try recognize(image)
}
print(text.prefix(8000))
