using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

public sealed class PocketButton : Button {
    private bool hovered, pressed;
    public PocketButton() {
        SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
    }
    protected override void OnMouseEnter(EventArgs e) { hovered=true; Invalidate(); base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { hovered=false; pressed=false; Invalidate(); base.OnMouseLeave(e); }
    protected override void OnMouseDown(MouseEventArgs e) { pressed=true; Invalidate(); base.OnMouseDown(e); }
    protected override void OnMouseUp(MouseEventArgs e) { pressed=false; Invalidate(); base.OnMouseUp(e); }
    protected override void OnPaint(PaintEventArgs e) {
        Graphics g=e.Graphics;
        g.Clear(ColorTranslator.FromHtml("#245DC3"));
        g.SmoothingMode=SmoothingMode.AntiAlias;
        Rectangle disk=new Rectangle(2,2,Width-5,Height-5);
        Color top=ColorTranslator.FromHtml(pressed?"#101B30":hovered?"#435874":"#30415A");
        Color bottom=ColorTranslator.FromHtml("#101B30");
        using(var brush=new LinearGradientBrush(disk,top,bottom,90f)) g.FillEllipse(brush,disk);
        using(var pen=new Pen(ColorTranslator.FromHtml("#0C1B36"),2f)) g.DrawEllipse(pen,disk);
        TextRenderer.DrawText(g,Text,Font,new Rectangle(0,pressed?2:0,Width,Height),Enabled?ForeColor:Color.FromArgb(116,137,168),TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter);
        if(Focused && ShowFocusCues) {
            using(var pen=new Pen(Color.FromArgb(170,205,255),2f)) g.DrawEllipse(pen,7,7,Width-15,Height-15);
        }
    }
}
