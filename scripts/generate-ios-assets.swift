#!/usr/bin/env swift

import AppKit
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

enum AssetError: Error, CustomStringConvertible {
    case usage
    case unreadableImage(String)
    case contextCreation
    case imageCreation
    case destinationCreation(String)
    case destinationWrite(String)

    var description: String {
        switch self {
        case .usage:
            return "Uso: generate-ios-assets.swift <root-progetto>"
        case let .unreadableImage(path):
            return "Impossibile leggere l'immagine sorgente: \(path)"
        case .contextCreation:
            return "Impossibile creare il contesto grafico RGB."
        case .imageCreation:
            return "Impossibile creare l'immagine finale."
        case let .destinationCreation(path):
            return "Impossibile creare il file PNG: \(path)"
        case let .destinationWrite(path):
            return "Impossibile scrivere il file PNG: \(path)"
        }
    }
}

func loadImage(at path: String) throws -> CGImage {
    guard let image = NSImage(contentsOfFile: path) else {
        throw AssetError.unreadableImage(path)
    }
    var rect = CGRect(origin: .zero, size: image.size)
    guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
        throw AssetError.unreadableImage(path)
    }
    return cgImage
}

func renderCanvas(
    width: Int,
    height: Int,
    source: CGImage,
    sourceRect: CGRect,
    background: CGColor
) throws -> CGImage {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    ) else {
        throw AssetError.contextCreation
    }

    context.interpolationQuality = .high
    context.setFillColor(background)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.draw(source, in: sourceRect)

    guard let result = context.makeImage() else {
        throw AssetError.imageCreation
    }
    return result
}

func writePNG(_ image: CGImage, to path: String) throws {
    let url = URL(fileURLWithPath: path) as CFURL
    guard let destination = CGImageDestinationCreateWithURL(
        url,
        UTType.png.identifier as CFString,
        1,
        nil
    ) else {
        throw AssetError.destinationCreation(path)
    }

    let properties = [kCGImagePropertyHasAlpha: false] as CFDictionary
    CGImageDestinationAddImage(destination, image, properties)
    guard CGImageDestinationFinalize(destination) else {
        throw AssetError.destinationWrite(path)
    }
}

do {
    guard CommandLine.arguments.count == 2 else { throw AssetError.usage }
    let root = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL
    let sourcePath = root.appendingPathComponent("public/scriptora-icon.png").path
    let source = try loadImage(at: sourcePath)
    let yellow = CGColor(red: 0.992, green: 0.729, blue: 0.0, alpha: 1.0)

    let icon = try renderCanvas(
        width: 1024,
        height: 1024,
        source: source,
        sourceRect: CGRect(x: 0, y: 0, width: 1024, height: 1024),
        background: yellow
    )
    let iconPath = root.appendingPathComponent(
        "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
    ).path
    try writePNG(icon, to: iconPath)

    let splashSide = 2732
    let logoSide = 1366
    let inset = (splashSide - logoSide) / 2
    let splash = try renderCanvas(
        width: splashSide,
        height: splashSide,
        source: source,
        sourceRect: CGRect(x: inset, y: inset, width: logoSide, height: logoSide),
        background: yellow
    )

    let splashDirectory = root.appendingPathComponent(
        "ios/App/App/Assets.xcassets/Splash.imageset"
    )
    for filename in [
        "splash-2732x2732.png",
        "splash-2732x2732-1.png",
        "splash-2732x2732-2.png",
    ] {
        try writePNG(splash, to: splashDirectory.appendingPathComponent(filename).path)
    }

    print("Asset iOS Scriptora generati correttamente.")
} catch {
    fputs("Errore asset iOS: \(error)\n", stderr)
    exit(1)
}
